/* ---- 面板 ---- */
import { renderSay, say } from '../game/coach.js';
import { gv } from '../stores/game-ui.js';
import { nextTick } from 'vue';
import { $, HIST, S, normLevel, savePrefs } from './state.js';
import { PVP, myTurn, narrow } from './sound.js';
import { assessPosition, colorName } from '../engine/engine.js';
import { enterReview, renderReview } from '../game/review.js';
import { showView } from './views.js';
import { ask, toast } from './dialogs.js';
import { inProgress } from './settings.js';
import { loadGame } from '../game/save.js';
import { wkCall } from './worker-client.js';
import { setRule } from '../engine/engine.js';
import { fitRuleset } from '../game/rulesets.js';
import { keepRulePref } from '../game/rulesets.js';

// 棋局数据变了之后要做的界面上的事：复盘时的布局、陪练气泡的「展开」、手机底栏高度
// （显示的内容本身由组件从 S 算出来，不用这里管）
export function updateUI() {
  renderReview(); renderSay();
  if (narrow()) requestAnimationFrame(syncBars);
}
function openHistGame(x) {
  S.mode = x.lv === 'pvp' ? 'pvp' : 'ai';
  if (x.lv !== 'pvp' && normLevel(x.lv)) S.level = normLevel(x.lv);
  if (x.h === 1 || x.h === 2) S.human = x.h;
  if (['renju', 'free', 'std'].includes(x.rule)) { keepRulePref(); S.rule = x.rule; S.openRule = x.or || 'free'; fitRuleset('rule'); }
  setRule(S.rule); savePrefs();
  loadGame(x.m, { wr: (x.wr || []).map(v => (v === null ? undefined : v)), elapsed: x.ms || 0, settled: true, rs: x.rs || 0 });
  if (!S.tEnd) S.tEnd = Date.now();
  enterReview(S.moves.length);
  showView('game');
  toast('已载入历史棋局，可以翻手复盘');
}
// 从战绩、棋谱里点开一局：有没下完的棋先问一声
export async function openHist(t) {
  const x = HIST.find(h => h.t === t); if (!x || !Array.isArray(x.m) || !x.m.length) return;
  if (inProgress() && !(await ask({ title: '打开这局棋？', text: RESET_TXT, ok: '打开' }))) return;
  openHistGame(x);
}
export const RESET_TXT = '当前这局还没下完，继续的话这局会直接结束，不计入战绩。';
function tickTime() { gv.clock++; }
// 底部固定栏的高度会随“落子”按钮出现而变化，同步给 CSS，浮层才不会被压住
export function syncBars() {
  const h = $('actions').offsetHeight || 68;
  document.documentElement.style.setProperty('--barH', Math.round(h) + 'px');
}
export function scheduleAssess() {
  const tk = S.token, n = S.moves.length;
  if (S.over) { S.wr[n] = S.winner === 1 ? 100 : S.winner === 2 ? 0 : 50; S.wrNote[n] = ''; return; }
  setTimeout(async () => {
    if (tk !== S.token || S.moves.length !== n || S.over || !S.showWR) return;
    const r = await wkCall({ type: 'assess' }, 4000);
    if (tk !== S.token || S.moves.length !== n || S.over) return;
    let [p, note] = (r && typeof r.p === 'number') ? [r.p, r.note] : assessPosition();
    applyWR(n, p, note);
  }, 0);
}
export function applyWR(n, p, note) {
  if (typeof p !== 'number') return;
  {
    const prev = n > 0 ? S.wr[n - 1] : undefined;
    if (!note && prev !== undefined && prev > 8 && prev < 92) p = prev * 0.2 + p * 0.8; // 非强制局面做轻度平滑
    S.wr[n] = p; S.wrNote[n] = note;
   
    // 形势变化明显时说一句，但不要太频繁
    if (S.coach && !S.over && n >= 6 && n - (S.lastSwing || -9) >= 6) {
      const prev6 = S.wr[n - 4];
      if (prev6 !== undefined && PVP()) {
        // 双人：形势明显倒向某一方、且领先方换了人时说一句
        const lead = p >= 60 ? 1 : p <= 40 ? 2 : 0, was = prev6 >= 60 ? 1 : prev6 <= 40 ? 2 : 0;
        if (lead && lead !== was && Math.abs(p - prev6) >= 15) { S.lastSwing = n; setTimeout(() => { if (S.coach && !S.over) say('pvpSwing', { side: `${colorName(lead)}棋`, other: `${colorName(3 - lead)}棋` }); }, 1600); }
      } else if (prev6 !== undefined) {
        const mine = S.human === 1 ? p - prev6 : prev6 - p;
        if (Math.abs(mine) >= 15) { S.lastSwing = n; say(mine > 0 ? 'swingUp' : 'swingDown'); }
      }
    }
  }
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  setInterval(() => {
    if (!S.over) tickTime();
    if (S.coach && !S.over && !S.thinking && S.review < 0 && !S.pending && myTurn() && S.lastMoveAt
        && Date.now() - S.lastMoveAt > 28000 && !S.idleSaid) { S.idleSaid = true; say('idle'); }
  }, 1000);
}
