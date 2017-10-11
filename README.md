# alloy-finger-vue
alloy-finger vue版的实现。喜欢的给个star

1、原版移动端是使用的理想视口布局，实际项目中可能就不是理想视口，如淘宝的flexible，对视口进行了缩放，因此对于swipe事件界定的30px对于iphone和android手势滑动的距离是不同的。故对此进行了适配。

2、longTap事件微调，原项目中触发longTap事件后会继续触发tap等事件，实际项目中longTap事件触发后可能就要阻止tap等相关事件。

3、阻止冒泡事件，由于其事件大部分是hack的，并不是原生事件，故阻止冒泡不能像原生那样进行，本方案提供了vue版本的自定义指令注入修饰符来阻止冒泡。
