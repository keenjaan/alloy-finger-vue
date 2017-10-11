var dpr, scale, timer;
var style = document.createElement('style');

dpr = window.devicePixelRatio || 1;
scale = 1 / dpr;

document.documentElement.setAttribute('data-dpr', dpr);
var metaEl = document.createElement('meta');
metaEl.setAttribute('name', 'viewport');
metaEl.setAttribute('content', 'target-densitydpi=device-dpi, initial-scale=' + scale + ', maximum-scale=' + scale + ', minimum-scale=' + scale + ', user-scalable=no');
document.documentElement.firstElementChild.appendChild(metaEl);
document.documentElement.firstElementChild.appendChild(style);
if (980 === document.documentElement.clientWidth) {
  metaEl.setAttribute('content', 'target-densitydpi=device-dpi,width=device-width,user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1');
}

function refreshRem () {
  var c = '}';
  var width = document.documentElement.clientWidth;
  var isPhone = window.navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i);
  if (!isPhone && width > 1024) {
    width = 640;
    c = 'max-width:' + width + 'px;margin-right:auto!important;margin-left:auto!important;}';
  }
  window.rem = rem = width / 16;
  style.innerHTML = 'html{font-size:' + rem + 'px!important;}body{font-size:' + parseInt(12 * (width / 320)) + 'px;' + c;;
}

refreshRem();

window.addEventListener('resize', function () {
  clearTimeout(timer);
  timer = setTimeout(refreshRem, 300);
}, false);

window.addEventListener('pageshow', function (e) {
  if (e.persisted) {
    clearTimeout(timer);
    timer = setTimeout(refreshRem, 300);
  }
}, false);