/* ================= 杀法练习：连续冲四取胜 =================
   每一手都要冲四（或直接成五），对方只能挡；一路冲到五连就算解开。
   你下的每一手都当场判断：不是冲四、被对方先成五、冲完就断了，都会退回去重下。 */
import { PUZZLES } from '../data/puzzles.js';
import { $ } from '../ui/state.js';
import { nextTick, reactive } from 'vue';
import { bt } from '../stores/boards.js';
import { b, cands, fivePointsNear, isFiveMove, isForbidden, place, unplace, vcfLine, withBoard } from '../engine/engine.js';
import { paintBoard, paintHover } from '../openings/book-page.js';
import { coord } from '../ui/sound.js';
import { dsLayout } from '../openings/book-layout.js';
import { VIEW, showView } from '../ui/views.js';
import { wkCall } from '../ui/worker-client.js';
import { winLineAt } from '../ui/game-rules.js';
import { achCheck } from '../features/achievements.js';
import { askResolve } from '../ui/dialogs.js';
import { load, save } from '../core/storage.js';

export const PZ_LV = [['入门', 11], ['进阶', 15], ['挑战', 99]];
export const pzLevel = p => PZ_LV.findIndex(([, max]) => p.len <= max);
export const cName = c => (c === 1 ? '黑' : '白');
export const PZREC = reactive({});
const pzSave = () => save('pz', PZREC);
export const PZ = reactive({ opened: false, k: 0, att: [], busy: 0, over: false, win: null, stamp: 0, hint: -1, hints: 0, wrong: 0, seen: false, msg: null, flash: null, sol: null, solKey: '', hov: -1, anim: 0 });
let flashSeq = 0;
export const pzP = () => PUZZLES[PZ.k];
export const pzLine = () => pzP().ms.concat(PZ.att);
const pzTurn = () => (pzLine().length % 2 === 0 ? 1 : 2);
export function pzGrade(r) { return !r ? '' : r.g === 'perfect' ? 'perfect' : r.g === 'done' ? 'done' : 'seen'; }
/* ---- 题目列表（PuzzleList.vue） ---- */
/* ---- 棋盘 ---- */
function pzForb() {
  if (PZ.over || PZ.busy || pzTurn() !== 1 || pzP().a !== 1) return [];
  return withBoard(pzLine(), () => cands().filter(i => isForbidden(i, 0)));
}
export function pzPaint() {
  const line = pzLine();
  PZ.forb = pzForb();
  if (paintBoard($('pzCv'), $('pzHv'), line, PZ.forb, pzP().ms.length)) pzHover(PZ.hov);
}
export function pzHover(i) {
  PZ.hov = i;
  paintHover($('pzHv'), i, { line: pzLine(), forb: PZ.forb || [], over: PZ.over || pzTurn() !== pzP().a, color: pzTurn(), busy: !!PZ.busy });
}
// 棋盘上盖的一层（提示、走错、五连线，PuzzlePanel.vue 画）；刚解开时盖一次「杀」字印章
let stampSeq = 0;
function pzOverlay() {
  if (PZ.stamp) {
    const key = ++stampSeq; bt.stamp = { perfect: PZ.stamp === 2, key }; PZ.stamp = 0;
    setTimeout(() => { if (bt.stamp && bt.stamp.key === key) bt.stamp = null; }, 2600);
  }
}
/* ---- 右栏 ---- */
export const PZ_ICO = {
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3 5.5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
// 题目（PuzzlePanel.vue）：数据变了就通知它重算，画完再量尺寸、画棋盘
function renderPz() {
  pzOverlay();
  nextTick(() => { dsLayout(); const seq = $('pzDetail').querySelector('.bk-seq'); if (seq) seq.scrollTop = seq.scrollHeight; });
}
function pzSay(kind, html) { PZ.msg = { kind, html }; }
/* ---- 打开题目 ---- */
export function openPuzzles(k) {
  if (k == null) { k = PUZZLES.findIndex(p => !PZREC[p.id] || PZREC[p.id].g === 'seen'); if (k < 0) k = 0; }
  showView('shafa');
  pzOpen(k);
}
export function pzOpen(k) {
  PZ.anim++; PZ.busy = 0; PZ.opened = true; bt.stamp = null;
  Object.assign(PZ, { k: Math.max(0, Math.min(PUZZLES.length - 1, k)), att: [], over: false, win: null, stamp: 0, hint: -1, hints: 0, wrong: 0, seen: false, msg: null, flash: null, sol: null, solKey: '' });
  renderPz();
}
export function pzReset() { PZ.anim++; PZ.busy = 0; Object.assign(PZ, { att: [], over: false, win: null, stamp: 0, hint: -1, msg: null, flash: null }); renderPz(); }
/* ---- 引擎：从当前局面找连续冲四 ---- */
export async function pzSolve(line) {
  const key = line.join(',');
  if (PZ.solKey === key && PZ.sol) return PZ.sol;
  const A = pzP().a;
  let r = await wkCall({ type: 'vcf', color: A, ms: 3000, moves: line, rule: 'renju' }, 8000);
  if (!r) try { r = withBoard(line, () => vcfLine(A, 3000)); } catch (e) { r = null; }
  const sol = { done: !!(r && r.done && r.seq && r.seq.length), seq: (r && r.seq) || [] };
  PZ.solKey = key; PZ.sol = sol;
  return sol;
}
// 判断一手棋：是否冲四、对方怎么应
function pzJudge(line, i) {
  const A = pzP().a, D = 3 - A;
  return withBoard(line, () => {
    if (b[i] !== 0) return { kind: 'occupied' };
    if (A === 1 && isForbidden(i, 0)) return { kind: 'forbidden' };
    place(i, A);
    if (isFiveMove(i, A)) return { kind: 'five' };
    const fp = fivePointsNear(i, A);
    if (!fp.length) return { kind: 'notfour' };
    const d5 = cands().filter(j => { place(j, D); const w = isFiveMove(j, D); unplace(j); return w; });
    if (d5.length) return { kind: 'deffive', at: d5[0] };
    const ok = fp.filter(j => !(D === 1 && isForbidden(j, 0)));
    if (!ok.length) return { kind: 'forbblock', dp: fp[0] };
    if (fp.length >= 2) return { kind: 'open', dp: ok[0], rest: fp.filter(j => j !== ok[0]) };
    return { kind: 'block', dp: fp[0] };
  });
}
const pzWait = ms => new Promise(r => setTimeout(r, ms));
// 解开：棋盘上画出五连（或标出挡不了的禁手点），盖一个「杀」字印章
function pzWin(forb) {
  PZ.over = true; PZ.hint = -1;
  const p = pzP(), g = PZ.seen ? 'seen' : PZ.hints || PZ.wrong ? 'done' : 'perfect';
  const last = PZ.att[PZ.att.length - 1];
  PZ.win = { line: forb == null ? withBoard(pzLine(), () => winLineAt(last, p.a)) : null, forb: forb == null ? -1 : forb };
  PZ.stamp = PZ.seen ? 0 : g === 'perfect' ? 2 : 1;
  const old = PZREC[p.id], rank = { seen: 0, done: 1, perfect: 2 };
  if (!old || rank[g] > rank[old.g]) { PZREC[p.id] = { g, t: Date.now() }; pzSave(); setTimeout(() => achCheck({ ev: 'pz' }), 600); }
  const n = Math.ceil(PZ.att.length / 2);
  pzSay('win', PZ.seen ? `这就是答案：${cName(p.a)}棋 ${n} 手连续冲四取胜。换一题，或者点「重来」自己再走一遍。`
    : `<b>杀！</b>${cName(p.a)}棋 ${n} 手连续冲四，${cName(3 - p.a)}棋挡不住了。${g === 'perfect' ? '一次解开，漂亮。' : `（用了${PZ.hints ? ` ${PZ.hints} 次提示` : ''}${PZ.hints && PZ.wrong ? '，' : ''}${PZ.wrong ? `走错 ${PZ.wrong} 次` : ''}）`}`);
  renderPz();
}
export async function pzPlay(i) {
  if (PZ.over || PZ.busy || pzTurn() !== pzP().a) return;
  const p = pzP(), A = p.a, D = 3 - A, line = pzLine(), tk = ++PZ.anim;
  PZ.flash = null;
  const j = pzJudge(line, i);
  const flash = () => { const f = ++flashSeq; PZ.flash = { i, f }; setTimeout(() => { if (PZ.flash && PZ.flash.f === f) PZ.flash = null; }, 1400); };
  const bad = (html) => { PZ.wrong++; flash(); pzSay('bad', html); renderPz(); };
  if (j.kind === 'occupied') return;
  if (j.kind === 'forbidden') { pzSay('bad', `${coord(i)} 是黑棋的禁手，不能下。`); flash(); renderPz(); return; }
  if (j.kind === 'notfour') return bad(`${coord(i)} 没有冲四。这里每一手都要冲四（或者直接成五），让${cName(D)}棋只能跟着挡。`);
  if (j.kind === 'deffive') return bad(`${cName(D)}棋已经有四了，你这手没挡，${cName(D)}棋会先在 ${coord(j.at)} 连成五。`);
  PZ.hint = -1;
  PZ.att.push(i);
  if (j.kind === 'five') { pzSay('ok', `${coord(i)} 连成五！`); return pzWin(); }
  if (j.kind === 'forbblock') { pzSay('ok', `黑棋唯一的防点 ${coord(j.dp)} 是禁手，挡不了。`); return pzWin(j.dp); }
  // 冲四：对方只能挡。挡完以后还要能继续冲下去才算对
  PZ.busy = tk; pzSay('wait', `${cName(D)}棋只能挡在 ${coord(j.dp)}…`); renderPz();
  await pzWait(320); if (PZ.anim !== tk) return;
  PZ.att.push(j.dp); pzPaint();
  if (j.kind === 'open') {
    PZ.busy = 0;
    pzSay('ok', `这手冲出了两个成五点，${cName(D)}棋只挡得住一头（${coord(j.dp)}）。在 <b>${j.rest.map(coord).join(' 或 ')}</b> 成五！`);
    return renderPz();
  }
  const pre = PZ.sol && PZ.solKey === line.join(',') && PZ.sol.seq[0] === i && PZ.sol.seq[1] === j.dp;
  let ok = pre;
  if (!ok) { pzSay('wait', `${cName(D)}棋挡在 ${coord(j.dp)}。看看还能不能接着冲下去…`); renderPz(); ok = (await pzSolve(pzLine())).done; }
  if (PZ.anim !== tk) return;
  PZ.busy = 0;
  if (ok) {
    if (pre) { PZ.sol = { done: true, seq: PZ.sol.seq.slice(2) }; PZ.solKey = pzLine().join(','); }
    pzSay('ok', `好，${cName(D)}棋只能挡在 ${coord(j.dp)}。继续冲。`); renderPz();
  } else {
    PZ.wrong++;
    pzSay('bad', `${coord(i)} 是冲四，可${cName(D)}棋挡在 ${coord(j.dp)} 以后，就再也冲不出杀了。退回去，换一手试试。`);
    PZ.flash = { i }; renderPz();
    await pzWait(1300); if (PZ.anim !== tk) return;
    PZ.att.length -= 2; PZ.flash = null; renderPz();
  }
}
export async function pzHint() {
  if (PZ.over || PZ.busy) return;
  const tk = ++PZ.anim; PZ.busy = tk; PZ.flash = null; pzSay('wait', '想一想…'); renderPz();
  const sol = await pzSolve(pzLine());
  if (PZ.anim !== tk) return;
  PZ.busy = 0;
  if (sol.done && sol.seq.length) { PZ.hints++; PZ.hint = sol.seq[0]; pzSay('hint', `提示：下在 <b>${coord(sol.seq[0])}</b>（棋盘上的绿圈）。`); }
  else pzSay('bad', '这个局面找不到连续冲四了，点「重来」从头试试。');
  renderPz();
}
export async function pzAnswer() {
  if (PZ.over || PZ.busy) return;
  const tk = ++PZ.anim; PZ.busy = tk; PZ.flash = null; pzSay('wait', '演示答案…'); renderPz();
  const sol = await pzSolve(pzLine());
  if (PZ.anim !== tk) return;
  if (!sol.done) { PZ.busy = 0; pzSay('bad', '这个局面找不到连续冲四了，点「重来」再看。'); return renderPz(); }
  PZ.seen = true; PZ.hint = -1;
  for (const m of sol.seq) { await pzWait(420); if (PZ.anim !== tk) return; PZ.att.push(m); pzPaint(); }
  // 冲出活四 / 四四时引擎只走到那一手：补上对方挡一头、自己成五
  const A = pzP().a, fin = withBoard(pzLine(), () => { const last = PZ.att[PZ.att.length - 1]; return isFiveMove(last, A) ? null : fivePointsNear(last, A); });
  if (fin && fin.length) {
    const ok = withBoard(pzLine(), () => fin.filter(j => !(A === 2 && isForbidden(j, 0))));
    if (ok.length && fin.length >= 2) { await pzWait(420); if (PZ.anim !== tk) return; PZ.att.push(ok[0]); pzPaint(); const w = fin.find(j => j !== ok[0]); await pzWait(420); if (PZ.anim !== tk) return; PZ.att.push(w); }
  }
  PZ.busy = 0; pzWin();
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  Object.assign(PZREC, load('pz', {}) || {});
  document.addEventListener('keydown', e => {
    if (VIEW !== 'shafa' || askResolve || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key, act = f => { e.preventDefault(); e.stopImmediatePropagation(); f(); };
    if (k === 'Escape') return act(() => showView('home'));
    if (k === 'ArrowLeft') return act(() => pzOpen(PZ.k - 1));
    if (k === 'ArrowRight') return act(() => pzOpen(PZ.k + 1));
    if (k === 'h' || k === 'H') return act(pzHint);
    if (k === 'r' || k === 'R') return act(pzReset);
  }, true);
}
