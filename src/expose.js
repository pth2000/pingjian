/* 把各模块导出的名字挂到 window 上（只读）：方便在浏览器控制台里调试，回归测试也靠它直接读写游戏状态。
   读取是「活」的，跟着模块里的值变；状态对象（S、ST……）的属性可以直接改。 */
const mods = import.meta.glob(['./**/*.js', '!./app.js', '!./expose.js', '!./engine/worker.js'], { eager: true });

for (const mod of Object.values(mods)) {
  for (const k of Object.keys(mod)) {
    if (k.startsWith('__') || k === 'default' || k in window) continue;
    Object.defineProperty(window, k, { configurable: true, get: () => mod[k] });
  }
}
