/* ---- 复盘 ---- */
import { emit } from '../core/hooks.js';
import { ADVICE_CFG, place, threatInfo } from '../engine/engine.js';
import { S } from '../ui/state.js';
import { aiTurn, hideResult } from './play.js';
import { layout, render } from '../ui/canvas.js';
import { updateUI } from '../ui/panel.js';
import { updateForb } from '../ui/game-rules.js';
import { saveGame } from './save.js';
import { PVP, narrow, toMove } from '../ui/sound.js';
import { wkCall } from '../ui/worker-client.js';
import { clearBoard } from '../engine/engine.js';
import { SWAP_OPENS } from './rulesets.js';
import { toast } from '../ui/dialogs.js';

export function rebuildBoard() {
  clearBoard();
  S.moves.forEach((m, k) => place(m, k % 2 === 0 ? 1 : 2));
}
// 每手棋让走子方的胜率变化了多少（正=变好）
export function moveDeltas() {
  const out = [];
  for (let k = 0; k < S.moves.length; k++) {
    const before = S.wr[k], after = S.wr[k + 1];
    if (before === undefined || after === undefined) { out.push(null); continue; }
    const c = k % 2 === 0 ? 1 : 2;
    out.push(c === 1 ? after - before : before - after);
  }
  return out;
}
export const blunderTag = d => (d === null ? '' : d <= -25 ? '??' : d <= -12 ? '?' : '');
// keepLesson：复盘讲解自己翻到某一手时带上；别的地方翻页就结束讲解
export function enterReview(idx, keepLesson) {
  if (!S.moves.length || S.op) return;             // 开局规则还没走完：不能复盘
  if (S.lesson && !keepLesson) { S.lesson = null; S.marks = null; }
  S.review = Math.max(0, Math.min(S.moves.length, idx));
  S.sel = -1; S.hint = -1;
  hideResult(); render(); updateUI();
  suggestForReview();
  emit('review');
}
export function exitReview() {
  S.lesson = null; S.marks = null;
  S.review = -1;
  render(); updateUI();
}
export function reviewGo(d) { if (S.review >= 0) enterReview(S.review + d); }
export function resumeFrom() {
  if (S.review < 0 || S.op) return;
  if (SWAP_OPENS.has(S.openRule) && S.review < (S.presetN || 0)) { toast('开局规则定下的几手之前不能接着下'); return; }
  if (S.settled) toast('这盘已经记过结果，续下的胜负不计入战绩');
  S.token++; S.lesson = null; S.marks = null;
  S.moves.length = S.review;
  S.presetN = Math.min(S.presetN || 0, S.moves.length); if (S.bookLeft && S.bookLeft.k >= S.moves.length) S.bookLeft = null;
  S.wr.length = Math.min(S.wr.length, S.moves.length + 1);
  S.wrNote.length = S.wr.length;
  S.sugg = {};
  rebuildBoard();
  Object.assign(S, { review: -1, over: false, winner: 0, resigned: 0, winLine: null, winCells: [], winAnim: 0, thinking: false });
  S.threat = (S.showThreat && S.moves.length) ? threatInfo(S.moves[S.moves.length - 1], S.moves.length % 2 === 0 ? 2 : 1) : null;
  updateForb(); render(); updateUI(); saveGame();
  if (!PVP() && toMove() !== S.human) aiTurn();
}
// 让引擎给出这个局面下它会怎么走
async function suggestForReview() {
  const idx = S.review;
  if (idx < 0 || idx >= S.moves.length) { renderReview(); return; }
  if (S.sugg[idx] !== undefined) { renderReview(); return; }
  renderReview();
  const tk = S.token, moves = S.moves.slice(0, idx), color = idx % 2 === 0 ? 1 : 2;
  const cfg = ADVICE_CFG;
  const r = await wkCall({ type: 'think', level: 'hard', cfg, color, moves }, 6000);
  if (tk !== S.token || S.review !== idx) return;
  if (r && typeof r.move === 'number' && r.move >= 0) { S.sugg[idx] = r.move; renderReview(); }
}
// 复盘条（ReviewBar.vue）；电脑端复盘条顶替按钮行，棋盘尺寸随之微调
export function renderReview() {
  const was = document.body.classList.contains('reviewing');
  document.body.classList.toggle('reviewing', S.review >= 0);
  if (was !== (S.review >= 0) && !narrow()) requestAnimationFrame(layout);
 
}
