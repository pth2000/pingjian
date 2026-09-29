/* 陪练在棋盘上的标注（画在 ui/canvas.js 的 drawMarks 里）。只在两种时候画：
   失误提醒暂停对局时（play.js 的 showCoach），和跟陪练复盘时（lesson.js）；平时的点评只说话，不在棋盘上画。
   S.marks：
     bad  你（或某一方）刚才下的那手，套一个「？」圈
     best 更好的点，画一颗走子方的虚子加实线圈
     opp  对方接下来会下的点，画一颗对方的虚子加虚线圈
     seq  { moves, c, from } 一串手顺（连续冲四、复盘时的变化），按顺序编号的虚子
     c    走子方（best / bad 的颜色）
   下一手落下时清掉（play.js 的 play()）。
   S.flash：陪练话里的坐标被指到时，那一点闪一下 */
import { S } from '../ui/state.js';
import { b } from '../engine/engine.js';
import { render } from '../ui/canvas.js';
import { coord } from '../ui/sound.js';

// 台词里的坐标：带上格子编号，指上去、点一下，棋盘上对应的点闪一下
export const ptag = i => `<b class="pt" data-i="${i}">${coord(i)}</b>`;

export function setMarks(m) { S.marks = m; render(); }
// 下错的一手：你下的、该下的、对方会怎么罚你
export function markSlip(bad, best, opp, c) {
  setMarks({ bad, best: best >= 0 && b[best] === 0 ? best : -1, opp: opp >= 0 && b[opp] === 0 && opp !== best ? opp : -1, c });
}
// 坐标被指到：闪一下（1.4 秒）
function flashPoint(i) {
  if (!(i >= 0)) return;
  S.flash = { i, t: performance.now() };
  render();
}
// 陪练气泡、失误提醒卡、复盘条里的坐标（<b class="pt" data-i>）：指上去或点一下就闪。点到了返回 true
export function onPt(e) {
  const t = e.target && e.target.closest ? e.target.closest('.pt') : null;
  if (!t) return false;
  flashPoint(+t.dataset.i);
  return true;
}
