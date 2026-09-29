/* ================= 隐藏禁手点（默认关闭） =================
   打开后，连珠规则下不再用红叉标出黑棋的禁手点；黑棋落在禁手点上直接判负（和正式比赛一样）。
   只管人（人机里执黑的你、双人对弈的黑方）；电脑执黑本来就不会下禁手。无禁手规则下不起作用。 */
import { S, savePrefs } from '../ui/state.js';
import { on } from '../core/hooks.js';
import { b, foursInDir, isForbidden, liveThreeInDir, runLen, withBoard } from '../engine/engine.js';
import { updateForb } from '../ui/game-rules.js';
import { finishGame, hideCoach, play } from '../game/play.js';
import { render } from '../ui/canvas.js';
import { updateUI } from '../ui/panel.js';
import { saveGame } from '../game/save.js';

// 是哪一种禁手（调用时 i 还空着）
function forbKind(i) {
  if (b[i] !== 0) return '';
  b[i] = 1;
  let k = '';
  for (let d = 0; d < 4; d++) if (runLen(i, d, 1) > 5) k = '长连';
  if (!k) { let f = 0, t = 0; for (let d = 0; d < 4; d++) { const n = foursInDir(i, d); f += n; if (!n && liveThreeInDir(i, d, 0)) t++; } k = f >= 2 ? '四四' : t >= 2 ? '三三' : '禁手'; }
  b[i] = 0;
  return k;
}
export function forbLose(i) {
  S.forbWhy = forbKind(i);
  hideCoach();
  play(i);
  S.forbLoss = i;
  if (!S.over) { S.over = true; S.winner = 2; S.winLine = null; S.winCells = []; finishGame(); }
  updateForb(); render(); updateUI(); saveGame();
}
/* ---- 开关：设置抽屉（SettingsForm.vue）和人机对弈页（SetupView.vue）都走这里 ---- */
export function hfSet(v) { S.hideForb = !!v; savePrefs(); updateForb(); render(); updateUI(); }
/* ---- 接到对局流程上（core/hooks.js） ---- */
export function __init() {
  on('newGame', () => { S.forbLoss = -1; });
  on('undo', () => { S.forbLoss = -1; });
  // 读回存档 / 打开棋谱：最后一手黑棋落在禁手上，就是禁手判负的那一局
  on('loaded', () => {
    S.forbLoss = -1;
    const n = S.moves.length, last = S.moves[n - 1];
    if (S.over || n % 2 !== 1 || S.rule !== 'renju') return;
    const w = withBoard(S.moves.slice(0, -1), () => isForbidden(last, 0) ? forbKind(last) : '');
    if (w) { S.thinking = false; S.forbLoss = last; S.forbWhy = w; S.over = true; S.winner = 2; S.tEnd = Date.now(); }
  });
  // 盘上判负那颗子的红圈叉：ui/canvas.js 的 render()；结算卡、状态栏的说明：play.js 的 showResult()、game/view.js 的 statusView()
}
