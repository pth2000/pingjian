/* 挂钩：对局流程在几个时刻「广播」一下，剧情、成就、隐藏禁手点这些附加功能各自接上，
   不用去改写（包一层）对局流程里的函数。

   newGame     开新局之前              undo    悔棋之前（不一定真的悔了）
   undone      真的悔了一步之后         hint    要提示时（已经确认能给提示）
   review      进入复盘之后             finishing / finished   一盘下完：记战绩之前 / 之后
   loaded      读回存档、打开棋谱之后   view    换到某一页之后（参数：页名） */
const H = {};
export function on(ev, fn) { (H[ev] || (H[ev] = [])).push(fn); }
export function emit(ev, ...args) { const fs = H[ev]; if (fs) for (const f of fs) f(...args); }
