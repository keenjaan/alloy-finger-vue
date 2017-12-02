/* AlloyFinger v0.1.0 for Vue
 * By june01
 * Github: https://github.com/AlloyTeam/AlloyFinger
 */

; (function () {  
    function getLen(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    function dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    function getAngle(v1, v2) {
        var mr = getLen(v1) * getLen(v2);
        if (mr === 0) return 0;
        var r = dot(v1, v2) / mr;
        if (r > 1) r = 1;
        return Math.acos(r);
    }

    function cross(v1, v2) {
        return v1.x * v2.y - v2.x * v1.y;
    }

    function getRotateAngle(v1, v2) {
        var angle = getAngle(v1, v2);
        if (cross(v1, v2) > 0) {
            angle *= -1;
        }

        return angle * 180 / Math.PI;
    }

    var HandlerAdmin = function(el) {
        this.handlers = [];
        this.el = el;
    };

    HandlerAdmin.prototype.add = function(handler) {
        this.handlers.push(handler);
    }

    HandlerAdmin.prototype.del = function(handler) {
        if(!handler) this.handlers = [];

        for(var i=this.handlers.length; i>=0; i--) {
            if(this.handlers[i] === handler) {
                this.handlers.splice(i, 1);
            }
        }
    }

    HandlerAdmin.prototype.dispatch = function() {
        for(var i=0,len=this.handlers.length; i<len; i++) {
            var handler = this.handlers[i];
            if(typeof handler === 'function') handler.apply(this.el, arguments);
        }
    }

    function wrapFunc(el, handler) {
        var handlerAdmin = new HandlerAdmin(el);
        handlerAdmin.add(handler);

        return handlerAdmin;
    }

    var AlloyFinger = function (el, option) {
        this.element = typeof el == 'string' ? document.querySelector(el) : el;
        this.start = this.start.bind(this);
        this.move = this.move.bind(this);
        this.end = this.end.bind(this);
        this.cancel = this.cancel.bind(this);
        this.element.addEventListener("touchstart", this.start, false);
        this.element.addEventListener("touchmove", this.move, false);
        this.element.addEventListener("touchend", this.end, false);
        this.element.addEventListener("touchcancel", this.cancel, false);

        this.preV = { x: null, y: null };
        this.pinchStartLen = null;
        this.zoom = 1;
        this.isDoubleTap = false;
        this.stopPropagation = option.stopPropagation || false;
        this.distance = option.size;

        var noop = function () { };

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

        this.delta = null;
        this.last = null;
        this.now = null;
        this.tapTimeout = null;
        this.singleTapTimeout = null;
        this.longTapTimeout = null;
        this.swipeTimeout = null;
        this.x1 = this.x2 = this.y1 = this.y2 = null;
        this.preTapPosition = { x: null, y: null };
        this.isLongTap = false;
    };

    AlloyFinger.prototype = {
        start: function (evt) {
            if (this.stopPropagation) {
                evt.stopPropagation();
            }
            if (!evt.touches) return;
            this.now = Date.now();
            this.x1 = evt.touches[0].pageX;
            this.y1 = evt.touches[0].pageY;
            this.delta = this.now - (this.last || this.now);
            this.touchStart.dispatch(evt);
            if (this.preTapPosition.x !== null) {
                this.isDoubleTap = (this.delta > 0 && this.delta <= 250 && Math.abs(this.preTapPosition.x - this.x1) < this.distance && Math.abs(this.preTapPosition.y - this.y1) < this.distance);
            }
            this.preTapPosition.x = this.x1;
            this.preTapPosition.y = this.y1;
            this.last = this.now;
            var preV = this.preV,
                len = evt.touches.length;
            if (len > 1) {
                this._cancelLongTap();
                this._cancelSingleTap();
                var v = { x: evt.touches[1].pageX - this.x1, y: evt.touches[1].pageY - this.y1 };
                preV.x = v.x;
                preV.y = v.y;
                this.pinchStartLen = getLen(preV);
                this.multipointStart.dispatch(evt);
            }
            this.longTapTimeout = setTimeout(function () {
                this.isLongTap = true;
                this.longTap.dispatch(evt);
            }.bind(this), 750);
        },
        move: function (evt) {
            if (this.stopPropagation) {
                evt.stopPropagation();
            }
            if (!evt.touches) return;
            var preV = this.preV,
                len = evt.touches.length,
                currentX = evt.touches[0].pageX,
                currentY = evt.touches[0].pageY;
            this.isDoubleTap = false;
            if (len > 1) {
                var v = { x: evt.touches[1].pageX - currentX, y: evt.touches[1].pageY - currentY };

                if (preV.x !== null) {
                    if (this.pinchStartLen > 0) {
                        evt.zoom = getLen(v) / this.pinchStartLen;
                        this.pinch.dispatch(evt);
                    }

                    evt.angle = getRotateAngle(v, preV);
                    this.rotate.dispatch(evt);
                }
                preV.x = v.x;
                preV.y = v.y;
            } else {
                if (this.x2 !== null) {
                    evt.deltaX = currentX - this.x2;
                    evt.deltaY = currentY - this.y2;

                } else {
                    evt.deltaX = 0;
                    evt.deltaY = 0;
                }
                this.pressMove.dispatch(evt);
            }

            this.touchMove.dispatch(evt);

            this._cancelLongTap();
            this.x2 = currentX;
            this.y2 = currentY;
            if (len > 1) {
                evt.preventDefault();
            }
        },
        end: function (evt) {
            if (this.stopPropagation) {
                evt.stopPropagation();
            }
            if (!evt.changedTouches) return;
            this._cancelLongTap();
            if (this.isLongTap) {
                this.isLongTap = false;
                return;
            }
            var self = this;
            if (evt.touches.length < 2) {
                this.multipointEnd.dispatch(evt);
            }

            //swipe
            if ((this.x2 && Math.abs(this.x1 - this.x2) > this.distance) ||
                (this.y2 && Math.abs(this.y1 - this.y2) > this.distance))  {
                evt.direction = this._swipeDirection(this.x1, this.x2, this.y1, this.y2);
                this.swipeTimeout = setTimeout(function () {
                    self.swipe.dispatch(evt);

                }, 0)
            } else {
                this.tapTimeout = setTimeout(function () {
                    self.tap.dispatch(evt);
                    // trigger double tap immediately
                    if (self.isDoubleTap) {
                        self.doubleTap.dispatch(evt);
                        clearTimeout(self.singleTapTimeout);
                        self.isDoubleTap = false;
                    }
                }, 0)

                if (!self.isDoubleTap) {
                    self.singleTapTimeout = setTimeout(function () {
                        self.singleTap.dispatch(evt);
                    }, 250);
                }
            }

            this.touchEnd.dispatch(evt);

            this.preV.x = 0;
            this.preV.y = 0;
            this.zoom = 1;
            this.pinchStartLen = null;
            this.x1 = this.x2 = this.y1 = this.y2 = null;
        },
        cancel: function (evt) {
            if (this.stopPropagation) {
                evt.stopPropagation();
            }
            clearTimeout(this.singleTapTimeout);
            clearTimeout(this.tapTimeout);
            clearTimeout(this.longTapTimeout);
            clearTimeout(this.swipeTimeout);
            this.touchCancel.dispatch(evt);
        },
        _cancelLongTap: function () {
            clearTimeout(this.longTapTimeout);
        },
        _cancelSingleTap: function () {
            clearTimeout(this.singleTapTimeout);
        },
        _swipeDirection: function (x1, x2, y1, y2) {
            return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
        },

        on: function(evt, handler) {
            if(this[evt]) {
                this[evt].add(handler);
            }
        },

        off: function(evt, handler) {
            if(this[evt]) {
                this[evt].del(handler);
            }
        },

        destroy: function() {
          if(this.singleTapTimeout) clearTimeout(this.singleTapTimeout);
          if(this.tapTimeout) clearTimeout(this.tapTimeout);
          if(this.longTapTimeout) clearTimeout(this.longTapTimeout);
          if(this.swipeTimeout) clearTimeout(this.swipeTimeout);

          this.element.removeEventListener("touchstart", this.start);
          this.element.removeEventListener("touchmove", this.move);
          this.element.removeEventListener("touchend", this.end);
          this.element.removeEventListener("touchcancel", this.cancel);

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

          this.distance = this.stopPropagation = this.isLongTap = this.preV = this.pinchStartLen = this.zoom = this.isDoubleTap = this.delta = this.last = this.now = this.tapTimeout = this.singleTapTimeout = this.longTapTimeout = this.swipeTimeout = this.x1 = this.x2 = this.y1 = this.y2 = this.preTapPosition = this.rotate = this.touchStart = this.multipointStart = this.multipointEnd = this.pinch = this.swipe = this.tap = this.doubleTap = this.longTap = this.singleTap = this.pressMove = this.touchMove = this.touchEnd = this.touchCancel = null;

          return null;
        }
    };

    var AlloyFingerPlugin = {
      install: function(Vue, options) {
        var size = options.size;
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

        var CACHE = [];

        var directiveOpts = {};

        // get the index for elem in CACHE
        var getElemCacheIndex = function(elem) {
          for(var i=0,len=CACHE.length; i<len; i++) {
            if(CACHE[i].elem === elem) {
              return i;
            }
          }

          return null;
        };

        // do on or off handler
        var doOnOrOff = function(cacheObj, options) {
          var eventName = options.eventName;
          var elem = options.elem;
          var func = options.func;
          var oldFunc = options.oldFunc;
          var modifiers = options.modifiers;
          if(cacheObj && cacheObj.alloyFinger) {
            if(cacheObj.alloyFinger.off && oldFunc) cacheObj.alloyFinger.off(eventName, oldFunc);
            if(cacheObj.alloyFinger.on && func) cacheObj.alloyFinger.on(eventName, func);
          } else {
            options = {};
            options[eventName] = func;
            options.stopPropagation = modifiers.stoppropagation;
            options.size = size;

            CACHE.push({
              elem: elem,
              alloyFinger: new AlloyFinger(elem, options)
            });
          }
        };
        // for bind the event
        var doBindEvent = function(elem, binding) {
          var func = binding.value;
          var oldFunc = binding.oldValue;
          var eventName = binding.arg;
          var modifiers = binding.modifiers;
          eventName = EVENTMAP[eventName];
          var cacheObj = CACHE[getElemCacheIndex(elem)];

          doOnOrOff(cacheObj, {
            elem: elem,
            func: func,
            oldFunc: oldFunc,
            eventName: eventName,
            modifiers: modifiers
          });
        };

        // for bind the event
        var doUnbindEvent = function(elem) {
          var index = getElemCacheIndex(elem);
          if(typeof index === 'number' && index >= 0) {
            var delArr = CACHE.splice(index, 1);
            if(delArr.length && delArr[0] && delArr[0].alloyFinger.destroy) {
              delArr[0].alloyFinger.destroy();
            }
          } 
        };

        directiveOpts = {
          bind: doBindEvent,
          update: doBindEvent,
          unbind: doUnbindEvent
        };

        // definition
        Vue.directive('finger', directiveOpts);
      }
    }
    if(typeof module !== 'undefined' && typeof exports === 'object') {
      module.exports = AlloyFingerPlugin;
    } else { 
      window.AlloyFingerVue = AlloyFingerPlugin;
    }
  })();