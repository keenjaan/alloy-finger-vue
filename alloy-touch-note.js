;(function () {
  // 计算距离和角度等的数学公式

  // 根据两边的长度求直角三角形斜边长度(主要用于求两点距离)
  function getLen(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
  }
  // 主要用于计算两次手势状态间的夹角的辅助函数
  function dot(v1, v2) {
      return v1.x * v2.x + v1.y * v2.y;
  }
  // 计算两次手势状态间的夹角
  function getAngle(v1, v2) {
      var mr = getLen(v1) * getLen(v2);
      if (mr === 0) return 0;
      var r = dot(v1, v2) / mr;
      if (r > 1) r = 1;
      return Math.acos(r);
  }
  // 计算夹角的旋转方向，(逆时针大于0，顺时针小于0)
  function cross(v1, v2) {
      return v1.x * v2.y - v2.x * v1.y;
  }
  // 将角度转换为弧度，并且绝对值
  function getRotateAngle(v1, v2) {
      var angle = getAngle(v1, v2);
      if (cross(v1, v2) > 0) {
          angle *= -1;
      }

      return angle * 180 / Math.PI;
  }
  // 用于处理手势监听函数的构造函数
  var HandlerAdmin = function(el) {
      this.handlers = []; // 监听函数列表
      this.el = el;       // 监听元素
  };
  // 构造函数的添加监听函数的方法
  HandlerAdmin.prototype.add = function(handler) {
      this.handlers.push(handler);
  }
  // 构造函数的删除监听函数的方法
  HandlerAdmin.prototype.del = function(handler) {
      if(!handler) this.handlers = []; // handler为假值时，代表清空监听函数列表

      for(var i=this.handlers.length; i>=0; i--) {
          if(this.handlers[i] === handler) {
              this.handlers.splice(i, 1);
          }
      }
  }
  // 触发用户事件监听回调函数
  HandlerAdmin.prototype.dispatch = function() {
      for(var i=0,len=this.handlers.length; i<len; i++) {
          var handler = this.handlers[i];
          if(typeof handler === 'function') handler.apply(this.el, arguments);
      }
  }
  // 实例化处理监听函数的对象
  function wrapFunc(el, handler) {
      var handlerAdmin = new HandlerAdmin(el);
      handlerAdmin.add(handler);  // 添加监听函数

      return handlerAdmin; // 返回实例
  }
  // 手势的构造函数
  var AlloyFinger = function (el, option) {

      this.element = typeof el == 'string' ? document.querySelector(el) : el; // 绑定事件的元素

      // 绑定原型上start, move, end, cancel函数的this对象为 AlloyFinger实例
      this.start = this.start.bind(this);
      this.move = this.move.bind(this);
      this.end = this.end.bind(this);
      this.cancel = this.cancel.bind(this);

      // 绑定原生的 touchstart, touchmove, touchend, touchcancel事件。
      this.element.addEventListener("touchstart", this.start, false);
      this.element.addEventListener("touchmove", this.move, false);
      this.element.addEventListener("touchend", this.end, false);
      this.element.addEventListener("touchcancel", this.cancel, false);

      this.preV = { x: null, y: null };   // 保存当有两个手指以上时，两个手指间横纵坐标的差值，用于计算两点距离
      this.pinchStartLen = null;  // 两个手指间的距离
      this.zoom = 1;              // 初始缩放比例
      this.isDoubleTap = false;   // 是否双击
      this.stopPropagation = option.stopPropagation || false; // 是否阻止冒泡
      this.distance = option.size; // 注入swipe事件滑动的距离

      var noop = function () { }; // 空函数，没有绑定事件时，传入的函数

      // 对14种手势，分别实例化监听函数对象，根据option的值添加相关监听函数，没有就添加空函数。
      this.rotate = wrapFunc(this.element, option.rotate || noop);
      this.touchStart = wrapFunc(this.element, option.touchStart || noop);
      this.multipointStart = wrapFunc(this.element, option.multipointStart || noop);
      this.multipointEnd = wrapFunc(this.element, option.multipointEnd || noop);
      this.pinch = wrapFunc(this.element, option.pinch || noop);
      this.swipe = wrapFunc(this.element, option.swipe || noop);
      this.tap = wrapFunc(this.element, option.tap || noop);
      this.doubleTap = wrapFunc(this.element, option.doubleTap || noop);
      this.longTap = wrapFunc(this.element, option.longTap || noop);
      this.singleTap = wrapFunc(this.element, option.singleTap || noop);
      this.pressMove = wrapFunc(this.element, option.pressMove || noop);
      this.touchMove = wrapFunc(this.element, option.touchMove || noop);
      this.touchEnd = wrapFunc(this.element, option.touchEnd || noop);
      this.touchCancel = wrapFunc(this.element, option.touchCancel || noop);

      this.delta = null;  // 用于判断是否是双击的时间戳
      this.last = null;   // 记录时间戳的变量
      this.now = null;    // 记录时间戳的变量
      this.tapTimeout = null;         //tap事件执行的定时器
      this.singleTapTimeout = null;   // singleTap执行的定时器
      this.longTapTimeout = null;     // longTap执行的定时器
      this.swipeTimeout = null;       // swipe执行的定时器
      this.x1 = this.x2 = this.y1 = this.y2 = null;   // start时手指的坐标x1, y1, move时手指的坐标x2, y2
      this.preTapPosition = { x: null, y: null };     // 记住start时，手指的坐标
      this.isLongTap = false;                         // 是否是长按
  };

  AlloyFinger.prototype = {
      start: function (evt) {
          // 阻止冒泡
          if (this.stopPropagation) {
              evt.stopPropagation();
          }
          if (!evt.touches) return;   // touches手指列表，没有就return
          this.now = Date.now();      // 记录当前事件点
          this.x1 = evt.touches[0].pageX;     // 第一个手指x坐标
          this.y1 = evt.touches[0].pageY;     // 第一个手指y坐标
          this.delta = this.now - (this.last || this.now);    // 时间戳
          this.touchStart.dispatch(evt);      // 触发touchStart事件
          if (this.preTapPosition.x !== null) {   
          // 不是第一次触摸屏幕时，比较两次触摸时间间隔，两次触摸间隔小于250ms，触摸点的距离小于30px时记为双击。
              this.isDoubleTap = (this.delta > 0 && this.delta <= 250 && Math.abs(this.preTapPosition.x - this.x1) < this.distance && Math.abs(this.preTapPosition.y - this.y1) < this.distance);
          }
          this.preTapPosition.x = this.x1;    // 将此次的触摸坐标保存到preTapPosition。
          this.preTapPosition.y = this.y1;
          this.last = this.now;               // 记录本次触摸时间点
          var preV = this.preV,               // 获取记录的两点坐标差值
              len = evt.touches.length;       // 手指个数
          if (len > 1) {                      // 手指个数大于1
              this._cancelLongTap();          // 取消longTap定时器
              this._cancelSingleTap();        // 取消singleTap定时器
              var v = { x: evt.touches[1].pageX - this.x1, y: evt.touches[1].pageY - this.y1 };
              // 计算两个手指间横纵坐标差，并保存到prev对象中，也保存到this.preV中。
              preV.x = v.x;
              preV.y = v.y;
              this.pinchStartLen = getLen(preV);  // 计算两个手指的间距
              this.multipointStart.dispatch(evt); // 触发multipointStart事件
          }
          // 开启longTap事件定时器，如果750ms内定时器没有被清除则触发longTap事件。
          this.longTapTimeout = setTimeout(function () {
              this.isLongTap = true;          // 触发了长按事件
              this.longTap.dispatch(evt);
          }.bind(this), 750);
      },
      move: function (evt) {
          // 阻止冒泡
          if (this.stopPropagation) {
              evt.stopPropagation();
          }
          if (!evt.touches) return;
          var preV = this.preV,   // start方法中保存的两点横纵坐标差值。
              len = evt.touches.length,   // 手指个数
              currentX = evt.touches[0].pageX,    // 第一个手指的x坐标
              currentY = evt.touches[0].pageY;    // 第一个手指的y坐标
          this.isDoubleTap = false;               // 移动了就不能是双击事件了
          if (len > 1) {
              // 获取当前两点横纵坐标的差值，保存到v对象中。
              var v = { x: evt.touches[1].pageX - currentX, y: evt.touches[1].pageY - currentY };
              // start保存的preV不为空，pinchStartLen大于0
              if (preV.x !== null) {
                  if (this.pinchStartLen > 0) {
                      // 当前两点的距离除以start中两点距离，求出缩放比，挂载到evt对象中
                      evt.zoom = getLen(v) / this.pinchStartLen;  
                      this.pinch.dispatch(evt);   // 触发pinch事件
                  }

                  evt.angle = getRotateAngle(v, preV);    // 计算旋转的角度，挂载到evt对象中
                  this.rotate.dispatch(evt);      // 触发rotate事件
              }
              preV.x = v.x;   // 将move中的两个手指的横纵坐标差值赋值给preV，同时也改变了this.preV
              preV.y = v.y;
          } else {
              // 出列一根手指的pressMove手势

              // 第一次触发move时，this.x2为null，move执行完会有给this.x2赋值。
              if (this.x2 !== null) {
                  // 用本次的move坐标减去上一次move坐标，得到x,y方向move距离。
                  evt.deltaX = currentX - this.x2;
                  evt.deltaY = currentY - this.y2;

              } else {
                  // 第一次执行move，所以移动距离为0，将evt.deltaX,evt.deltaY赋值为0.
                  evt.deltaX = 0;
                  evt.deltaY = 0;
              }
              // 触发pressMove事件
              this.pressMove.dispatch(evt);
          }
          // 触发touchMove事件，挂载不同的属性给evt对象抛给用户
          this.touchMove.dispatch(evt);

          // 取消长按定时器，750ms内可以阻止长按事件。
          this._cancelLongTap();
          this.isLongTap = false; // 长按设置为false
          this.x2 = currentX;     // 记录当前第一个手指坐标
          this.y2 = currentY;
          if (len > 1) {
              evt.preventDefault();   // 两个手指以上阻止默认事件
          }
      },
      end: function (evt) {
          // 阻止冒泡事件
          if (this.stopPropagation) {
              evt.stopPropagation();
          }
          if (!evt.changedTouches) return;
          // 取消长按定时器，750ms内会阻止长按事件
          this._cancelLongTap();
          // 判断如果触发了长按事件，将阻止end里的所有事件，包括tap、singleTap、doubleTap、swipe
          if (this.isLongTap) {
              this.isLongTap = false; // 重置长按判断条件
              return;                 // return掉，阻止下面操作
          }       
          var self = this;    // 保存当前this对象。
          // 如果当前留下来的手指数小于2，触发multipointEnd事件
          if (evt.touches.length < 2) {
              this.multipointEnd.dispatch(evt);
          }

          // this.x2或this.y2存在代表触发了move事件。
          // Math.abs(this.x1 - this.x2)代表在x方向移动的距离。
          // 故就是在x方向或y方向移动的距离大于30px时则触发swipe事件
          if ((this.x2 && Math.abs(this.x1 - this.x2) > this.distance) ||
              (this.y2 && Math.abs(this.y1 - this.y2) > this.distance)) {
              // 计算swipe的方向并写入evt对象。
              evt.direction = this._swipeDirection(this.x1, this.x2, this.y1, this.y2);
              this.swipeTimeout = setTimeout(function () {
                  self.swipe.dispatch(evt);   // 异步触发swipe事件

              }, 0)
          } else {
              this.tapTimeout = setTimeout(function () {
                  self.tap.dispatch(evt); // 异步触发tap事件
                  // trigger double tap immediately
                  if (self.isDoubleTap) { // start方法中计算的满足双击条件时
                      self.doubleTap.dispatch(evt);   // 触发双击事件
                      clearTimeout(self.singleTapTimeout);    // 清楚singleTap事件定时器
                      self.isDoubleTap = false;   // 重置双击条件
                  }
              }, 0)

              if (!self.isDoubleTap) {    // 如果不满足双击条件
                  self.singleTapTimeout = setTimeout(function () {
                      self.singleTap.dispatch(evt);   // 触发singleTap事件
                  }, 250);
              }
          }

          this.touchEnd.dispatch(evt);    // 触发touchEnd事件
          // end结束后重置相关的变量
          this.preV.x = 0;
          this.preV.y = 0;
          this.zoom = 1;
          this.pinchStartLen = null;
          this.x1 = this.x2 = this.y1 = this.y2 = null;
      },
      cancel: function (evt) {
          // 阻止冒泡事件
          if (this.stopPropagation) {
              evt.stopPropagation();
          }
          // 关闭所有定时器
          clearTimeout(this.singleTapTimeout);
          clearTimeout(this.tapTimeout);
          clearTimeout(this.longTapTimeout);
          clearTimeout(this.swipeTimeout);
          this.touchCancel.dispatch(evt);
      },
      _cancelLongTap: function () {
          clearTimeout(this.longTapTimeout); // 关闭longTap定时器
      },
      _cancelSingleTap: function () {
          clearTimeout(this.singleTapTimeout); // 关闭singleTap定时器
      },
      _swipeDirection: function (x1, x2, y1, y2) {
          // 判断swipe方向
          return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
      },
      // 给14中手势中一种手势添加监听函数
      on: function(evt, handler) {
          if(this[evt]) { // 事件名在这14中之中，才添加函数到监听事件中
              this[evt].add(handler);
          }
      },
      // 给14中手势中一种手势移除监听函数
      off: function(evt, handler) {
          if(this[evt]) { // 事件名在这14中之中，才移除相应监听函数
              this[evt].del(handler);
          }
      },
      // 清空，重置所有数据
      destroy: function() {
          // 关闭所有定时器
          if(this.singleTapTimeout) clearTimeout(this.singleTapTimeout);
          if(this.tapTimeout) clearTimeout(this.tapTimeout);
          if(this.longTapTimeout) clearTimeout(this.longTapTimeout);
          if(this.swipeTimeout) clearTimeout(this.swipeTimeout);
          // 移除touch的四个事件
          this.element.removeEventListener("touchstart", this.start);
          this.element.removeEventListener("touchmove", this.move);
          this.element.removeEventListener("touchend", this.end);
          this.element.removeEventListener("touchcancel", this.cancel);
          // 清除所有手势的监听函数
          this.rotate.del();
          this.touchStart.del();
          this.multipointStart.del();
          this.multipointEnd.del();
          this.pinch.del();
          this.swipe.del();
          this.tap.del();
          this.doubleTap.del();
          this.longTap.del();
          this.singleTap.del();
          this.pressMove.del();
          this.touchMove.del();
          this.touchEnd.del();
          this.touchCancel.del();
          // 重置所有变量
          this.distance = this.stopPropagation = this.isLongTap = this.preV = this.pinchStartLen = this.zoom = this.isDoubleTap = this.delta = this.last = this.now = this.tapTimeout = this.singleTapTimeout = this.longTapTimeout = this.swipeTimeout = this.x1 = this.x2 = this.y1 = this.y2 = this.preTapPosition = this.rotate = this.touchStart = this.multipointStart = this.multipointEnd = this.pinch = this.swipe = this.tap = this.doubleTap = this.longTap = this.singleTap = this.pressMove = this.touchMove = this.touchEnd = this.touchCancel = null;

          return null;
      }
  };
  // vue 版本的实现
  var AlloyFingerPlugin = {
    // 用于vue挂载指令的install函数
    install: function(Vue, options) {
      // options挂载指令时传递的参数
      var size = options.size; // swipe事件滑动的距离
      // 14中手势命名
      var EVENTMAP = {
        'touch-start': 'touchStart',
        'touch-move': 'touchMove',
        'touch-end': 'touchEnd',
        'touch-cancel': 'touchCancel',
        'multipoint-start': 'multipointStart',
        'multipoint-end': 'multipointEnd',
        'tap': 'tap',
        'double-tap': 'doubleTap',
        'long-tap': 'longTap',
        'single-tap': 'singleTap',
        'rotate': 'rotate',
        'pinch': 'pinch',
        'press-move': 'pressMove',
        'swipe': 'swipe'
      };
      // 记录元素添加监听事件的数组。
      var CACHE = [];
      // 创建空对象，用于存放vue自定义指令directive的参数对象
      var directiveOpts = {};

      // 获取某个元素在CACHE中是否存在，存在返回index，不存在返回null
      var getElemCacheIndex = function(elem) {
        for(var i=0,len=CACHE.length; i<len; i++) {
          if(CACHE[i].elem === elem) {
            return i;
          }
        }

        return null;
      };

      // 绑定或解绑事件监听函数
      var doOnOrOff = function(cacheObj, options) {
        var eventName = options.eventName;  // 事件名
        var elem = options.elem;            // 监听元素
        var func = options.func;            // 监听函数
        var oldFunc = options.oldFunc;      // dom更新时，旧的监听函数
        var modifiers = options.modifiers;  // 自定义指令修饰符集合(一个对象)
        // 如果给该元素添加过事件
        if(cacheObj && cacheObj.alloyFinger) {
          // 如果是dom更新触发的，不是初始化绑定事件，即oldFunc存在，就解绑上一次绑定的函数oldFunc。
          if(cacheObj.alloyFinger.off && oldFunc) cacheObj.alloyFinger.off(eventName, oldFunc);
          // 如果func存在，不管是初始化还是dom更新，都绑定func
          if(cacheObj.alloyFinger.on && func) cacheObj.alloyFinger.on(eventName, func);
        } else {
          // 如果没有给该元素添加过事件
          options = {};   // 创建空对象
          options[eventName] = func;  // 添加监听事件的监听函数
          options.stopPropagation = modifiers.stoppropagation;  // 是否需要阻止冒泡
          options.size = size;  // 注入swipe距离
          // 向CACHE中添加监听元素及其监听的事件和函数
          CACHE.push({
            elem: elem,
            alloyFinger: new AlloyFinger(elem, options) // 初始化AlloyFinger绑定相关事件
          });
        }
      };

      // vue 自定义指令的初始化函数
      var doBindEvent = function(elem, binding) {
        var func = binding.value;       // 监听函数
        var oldFunc = binding.oldValue; // 旧的监听函数
        var eventName = binding.arg;    // 监听的事件名
        var modifiers = binding.modifiers;  // 监听事件修饰符
        eventName = EVENTMAP[eventName];    // 将事件名转换为驼峰法
        var cacheObj = CACHE[getElemCacheIndex(elem)];  // 获取某个元素是否添加过事件监听，添加到CACHE。
        // 触发事件监听函数的绑定或移除
        doOnOrOff(cacheObj, {
          elem: elem,
          func: func,
          oldFunc: oldFunc,
          eventName: eventName,
          modifiers: modifiers
        });
      };

      // 移除事件监听函数
      var doUnbindEvent = function(elem) {
        var index = getElemCacheIndex(elem);  // 在CACHE中获取elem的index值
        if(!isNaN(index)) { // 如果元素在CACHE中存在
          var delArr = CACHE.splice(index, 1);  // 删除该条监听事件
          if(delArr.length && delArr[0] && delArr[0].alloyFinger.destroy) {
            delArr[0].alloyFinger.destroy();  // 重置手势alloyFinger对象，停止所有定时器，移除所有监听函数，清空所有变量。
          }
        } 
      };

      // directive参数
      directiveOpts = {
        bind: doBindEvent,
        update: doBindEvent,
        unbind: doUnbindEvent
      };

      // definition
      Vue.directive('finger', directiveOpts); // 绑定自定义指令finger
    }
  }

  // 如果当前环境支持module，exports等es6语法，则导出AlloyFingerPlugin模块
  if(typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = AlloyFingerPlugin;
  } else { // 否则将AlloyFingerPlugin注册到全局对象
    window.AlloyFingerVue = AlloyFingerPlugin;
  }
})();