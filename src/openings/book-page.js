/* ---- 定式页：顶部选开局，棋盘下面像翻棋谱一样前后翻 ---- */
import { $ } from '../ui/state.js';
import { reactive } from 'vue';
import { isBad, isBook, kDepth, kSize, rankKids } from './tree.js';
import { wkCall } from '../ui/worker-client.js';
import { LETTERS, N, assessPosition, cands, isForbidden, topMoves, withBoard } from '../engine/engine.js';
import { VIEW } from '../ui/views.js';
import { renderBookDetail } from './book-layout.js';
import { winLineAt } from '../ui/game-rules.js';
import { cell, ctx, dpr, drawStone, dsWith, jit, makeWood, px, py, woodCache } from '../ui/canvas.js';
import { markForb, markLast } from '../ui/canvas.js';

// 定式页的状态：选中的开局、当前手顺（line）、退回去的几手（fwd）、引擎算过的局面（cache）、练习（pr）
export const BK = reactive({ hov: -1, hovSt: null, op: null, line: [], src: [], fwd: [], cache: new Map(), pending: new Set(), busy: 0, job: '', all: false, pr: null });
export const bkKey = ms => ms.join(',');
// 出了谱以后，用内置引擎现算几个候选
export async function bkAnalyse() {
  const ms = BK.line.slice(), key = bkKey(ms);
  if (BK.cache.has(key) || BK.pending.has(key)) return;
  const tk = ++BK.busy;
  BK.pending.add(key);
  const color = ms.length % 2 === 0 ? 1 : 2;
  let [top, as] = await Promise.all([
    wkCall({ type: 'top', color, k: 3, moves: ms, rule: 'renju' }, 9000),
    wkCall({ type: 'assess', moves: ms, rule: 'renju' }, 6000),
  ]);
  if (!top) try { top = { list: withBoard(ms, () => topMoves(color, 3)) }; } catch (e) {}
  if (!as) try { const a = withBoard(ms, () => assessPosition()); as = { p: a[0], note: a[1] }; } catch (e) {}
  const res = { cands: top && top.list ? top.list.map(x => ({ m: x.m, kind: x.kind })) : null, p: as && typeof as.p === 'number' ? as.p : null };
  BK.cache.set(key, res); BK.pending.delete(key);
  if (tk === BK.busy && bkKey(BK.line) === key && VIEW === 'dingshi') renderBookDetail();
}
export function bkState() {
  return withBoard(BK.line, () => {
    const n = BK.line.length, last = BK.line[n - 1], c = n % 2 === 0 ? 2 : 1;
    const win = n ? winLineAt(last, c) : null;
    const forb = (n % 2 === 0) ? cands().filter(i => isForbidden(i, 0)) : [];
    return { win: win ? c : 0, forb };
  });
}
// 主线：只走不带疑问的定式，挑能走得最深的那一路
export const gDepth = n => (n.gd !== undefined ? n.gd : (n.gd = 1 + n.k.reduce((d, c) => (c.b && c.q !== -1 ? Math.max(d, gDepth(c)) : d), 0)));
export function mainKid(bs, used) {
  if (!bs || !bs.inBook) return null;
  const free = bs.kids.filter(q => !used.includes(q.i));
  const pool = [q => isBook(q) && !isBad(q), q => !isBad(q), () => true].map(f => free.filter(f)).find(x => x.length) || [];
  return pool.slice().sort((p2, q2) => gDepth(q2.n) - gDepth(p2.n) || kDepth(q2.n) - kDepth(p2.n) || kSize(q2.n) - kSize(p2.n))[0] || null;
}
// 这一手的下法按顺序排好：主线在最前，其余按好坏
export function orderedKids(bs) {
  if (!bs || !bs.inBook) return [];
  const m = mainKid(bs, BK.line), rest = rankKids(bs).filter(k => k !== m && !BK.line.includes(k.i));
  return m ? [m, ...rest] : rest;
}
/* ---- 定式棋盘：木纹、网格、棋子、手数都用对弈页同一套画法（画在 canvas 上），
        推荐下法的编号圈用一层 SVG 盖在上面，方便点击 ---- */
export const DS = { wood: null, size: 0, dpr: 0 };
function dsCanvasSize(cv, hv) {
  if (!cv) return false;
  const s = Math.round(cv.getBoundingClientRect().width), d = window.devicePixelRatio || 1;
  if (!s) return false;
  const W = Math.round(s * d);
  if (s !== DS.size || d !== DS.dpr || !DS.wood) { DS.size = s; DS.dpr = d; DS.wood = null; DS.wood = dsWith(cv, () => makeWood(W, W)); }
  for (const c of [cv, hv]) if (c.width !== W) { c.width = W; c.height = W; }
  return true;
}
// 画一盘棋：line 是从黑棋开始交替的全部手顺；numFrom 起的棋子标手数（从 1 数起），之前的不标
export function paintBoard(cv, hv, line, forb, numFrom = 0) {
  if (!dsCanvasSize(cv, hv)) return false;
  dsWith(cv, () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(woodCache, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    forb.forEach(markForb);                       // 禁手点：和对弈页一样的红叉
    line.forEach((m, k) => drawStone(m, k % 2 === 0 ? 1 : 2));
    const nums = line.length - numFrom;
    ctx.font = `600 ${Math.max(8, cell * (nums > 99 ? 0.3 : 0.36))}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = Math.max(0, numFrom); k < line.length; k++) { const m = line[k], [jx, jy] = jit(m); ctx.fillStyle = k % 2 === 0 ? '#F2F2EC' : '#1B1B1B'; ctx.fillText(String(k - numFrom + 1), px(m) + jx, py(m) + jy + 0.5); }
    if (line.length) markLast(line[line.length - 1], line.length > numFrom);   // 标了手数：套圈；没标：朱色小点
  });
  return true;
}
// 悬停：朱色坐标签 + 将要落下的虚子（禁手点画红叉）
export function paintHover(hv, i, o) {
  if (!hv || !DS.wood) return;
  dsWith(hv, () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, hv.width, hv.height);
    if (i < 0 || o.busy) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.font = `600 ${Math.max(8.5, cell * 0.27)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const chip = (t, x, y) => {
      const w = Math.max(cell * 0.46, ctx.measureText(t).width + cell * 0.2), h = cell * 0.4;
      ctx.fillStyle = 'rgba(198,47,36,.92)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.3) : ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill();
      ctx.fillStyle = '#FFF6F0'; ctx.fillText(t, x, y + 0.5);
    };
    chip(LETTERS[i % N], px(i), cell * N + cell * 0.58);
    chip(String(N - ((i / N) | 0)), cell * 0.44, py(i));
    ctx.restore();
    if (!o.over && !o.line.includes(i)) {
      if (o.forb.includes(i)) {
        ctx.strokeStyle = 'rgba(198,47,36,.9)'; ctx.lineWidth = Math.max(2, cell * 0.08); ctx.lineCap = 'round';
        const s2 = cell * 0.2, x = px(i), y = py(i);
        ctx.beginPath(); ctx.moveTo(x - s2, y - s2); ctx.lineTo(x + s2, y + s2); ctx.moveTo(x + s2, y - s2); ctx.lineTo(x - s2, y + s2); ctx.stroke();
      } else drawStone(i, o.color, 0.45);
    }
  });
}
export function dsPaint() {
  const st = BK.hovSt || { forb: [], win: 0 };
  if (paintBoard($('bkCv'), $('bkHv'), BK.line, st.forb, 0)) bkHover(BK.hov);
}
// 鼠标在棋盘上：和对弈页一样，边上的坐标变成朱色小签，空点上显示将要落下的虚子
export function bkHover(i) {
  BK.hov = i;
  const st = BK.hovSt || { forb: [], win: 0 };
  const P = BK.pr, notMine = !!P && (P.busy || P.decide || P.over || (BK.line.length % 2 === 0 ? 1 : 2) !== P.human);
  paintHover($('bkHv'), i, { line: BK.line, forb: st.forb, over: !!st.win || notMine, color: BK.line.length % 2 === 0 ? 1 : 2, busy: !!BK.job });
}
export function bkCell(e, el) {
  const r = el.getBoundingClientRect(), u = r.width / (N + 1);
  const x = Math.round((e.clientX - r.left) / u - 1), y = Math.round((e.clientY - r.top) / u - 1);
  return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : -1;
}
export const ICO = {
  first: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h2v10H3zM13 3v10L6 8z"/></svg>',
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 3v10L4 8z"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10l7-5z"/></svg>',
  last: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10l7-5zM11 3h2v10h-2z"/></svg>',
};
