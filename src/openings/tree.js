import { markRaw } from 'vue';
import { OPENINGS, OP_EV, OP_KIND, T8, opMoves } from './openings.js';
import { CENTER, N, b } from '../engine/engine.js';
import { TREE, TREE_NOTES } from '../data/tree.js';
import { PVP, coord } from '../ui/sound.js';
import { S } from '../ui/state.js';
export const opLabel = o => `${o.name}局`;
export const opTag = o => `${OP_KIND[o.k]}第 ${o.n} 局`;
/* ---- 开局谱：一棵树。定式（定式全集 + 励精连珠教室）与 AI 开局库（Rapfi）合在一起 ---- */
// 节点：m 位置；b 定式；q 1 好 / -1 坏；t 说明；r 结论；l 长篇讲解；u 出处；w 走后黑胜率（AI）；a 2 AI 首选 / 1 AI 备选；k 子节点
const jkRel = i => [(i % N) - 7, 7 - ((i / N) | 0)];
const jkAbs = (x, y) => (x < -7 || x > 7 || y < -7 || y > 7) ? -1 : (7 - y) * N + (7 + x);
export const tfTo = (t, i) => { const [x, y] = jkRel(i); return jkAbs(t[0] * x + t[1] * y, t[2] * x + t[3] * y); };     // 实战 → 谱上坐标
const tfBack = (t, i) => { const [x, y] = jkRel(i); return jkAbs(t[0] * x + t[2] * y, t[1] * x + t[3] * y); };   // 谱上坐标 → 实战
const TR = {};
export function treeOf(id) {
  if (TR[id]) return TR[id];
  const D = TREE[id], root = markRaw({ m: -1, k: [] });
  if (!D) return (TR[id] = root);
  const s = D.s, NT = TREE_NOTES; let p = 0;
  const num = () => { const q = p; while (s[p] !== '.') p++; return s.slice(q, p++); };
  const coordAt = () => { const m = (s.charCodeAt(p) - 97) + (s.charCodeAt(p + 1) - 97) * N; p += 2; return m; };
  function node() {
    const n = markRaw({ m: coordAt(), k: [] });   // 谱的节点很多，而且会在节点上缓存计算结果：不做成响应式
    for (;;) {
      const c = s[p];
      if (c === '#') { n.b = 1; p++; }
      else if (c === '+') { n.q = 1; p++; } else if (c === '-') { n.q = -1; p++; }
      else if (c === '~') { p++; n.t = NT[parseInt(num(), 36)]; }
      else if (c === '=') { p++; n.r = NT[parseInt(num(), 36)]; }
      else if (c === '%') { p++; n.l = NT[parseInt(num(), 36)]; }
      else if (c === '&') { p++; n.u = NT[parseInt(num(), 36)]; }
      else if (c === '^') { p++; const v = num(); n.w = v === '' ? null : +v; }
      else if (c === '!') { n.a = 2; p++; } else if (c === '*') { n.a = 1; p++; }
      else break;
    }
    if (s[p] === '(') { while (s[p] === '(') { p++; n.k.push(node()); p++; } }
    else if (p < s.length && s[p] >= 'a' && s[p] <= 'o') n.k.push(node());
    return n;
  }
  while (s[p] === '(') { p++; root.k.push(node()); p++; }
  root.l = D.d >= 0 ? NT[D.d] : ''; root.v = D.v;
  return (TR[id] = root);
}
// 这盘棋走到现在还在不在谱里（旋转、翻转都试一遍，取走得最深的那个）
export function bookState(ms) {
  if (!ms || ms.length < 3 || ms[0] !== CENTER) return null;
  const all = [];
  for (const t of T8) {
    const a = tfTo(t, ms[1]), c = tfTo(t, ms[2]);
    const o = OPENINGS.find(x => { const om = opMoves(x); return om[1] === a && om[2] === c; });
    if (!o) continue;
    let nd = treeOf(o.id), k = 3;
    for (; k < ms.length; k++) { const q = tfTo(t, ms[k]); const nx = q < 0 ? null : nd.k.find(x => x.m === q); if (!nx) break; nd = nx; }
    all.push({ o, t, nd, depth: k - 3, inBook: k === ms.length });
  }
  if (!all.length) return null;
  all.sort((p, q) => (q.inBook - p.inBook) || (q.depth - p.depth));
  let best = all[0];
  // 次序不同、局面相同：去别的开局（或同一局的别的分支）里找这个局面，接着用那边的谱
  if ((!best.inBook || !best.nd.k.length) && ms.length <= POS_DEPTH) {
    const tp = transposed(ms);
    if (tp) return tp;
  }
  const kids = new Map();                          // 对称的局面里，几个方向的谱都算（例如花月白4 的 G7 与 J10）
  if (best.inBook) for (const f of all) {
    if (!f.inBook || f.depth !== best.depth || f.o !== best.o) continue;
    for (const n of f.nd.k) {
      const i = tfBack(f.t, n.m); if (i < 0 || kids.has(i)) continue;
      kids.set(i, { i, n, black: ms.length % 2 === 0 });
    }
  }
  return Object.assign(best, { kids: [...kids.values()], node: best.depth ? best.nd : null });
}
// ---- 同形换序：按局面（不看次序、不看旋转翻转）建一张索引 ----
const POS_DEPTH = 16;
let POSIX = null;
function stonesOf(ms) { const B = [], W = []; ms.forEach((m, k) => (k % 2 ? W : B).push(m)); return [B, W]; }
function posKey(B, W, t) { const f = i => tfTo(t, i), c = (x, y) => x - y; return B.map(f).sort(c).join(',') + '|' + W.map(f).sort(c).join(','); }
function canonKey(ms) { const [B, W] = stonesOf(ms); let best = null; for (const t of T8) { const k = posKey(B, W, t); if (best === null || k < best) best = k; } return best; }
function buildPosIndex() {
  POSIX = new Map();
  for (const o of OPENINGS) {
    const ms = opMoves(o);
    const walk = nd => {
      if (ms.length > 3 && nd.k.length) { const key = canonKey(ms), cur = POSIX.get(key); if (!cur || kSize(nd) > kSize(cur.nd)) POSIX.set(key, { o, nd, ms: ms.slice() }); }
      if (ms.length < POS_DEPTH) for (const c of nd.k) { ms.push(c.m); walk(c); ms.pop(); }
    };
    walk(treeOf(o.id));
  }
}          // 空闲时先建好，免得对局中卡一下
function transposed(ms) {
  if (!POSIX) buildPosIndex();
  const e = POSIX.get(canonKey(ms)); if (!e) return null;
  const [B, W] = stonesOf(ms), [eB, eW] = stonesOf(e.ms), c = (x, y) => x - y, eb = eB.slice().sort(c).join(','), ew = eW.slice().sort(c).join(',');
  const t = T8.find(t2 => B.map(i => tfTo(t2, i)).sort(c).join(',') === eb && W.map(i => tfTo(t2, i)).sort(c).join(',') === ew);
  if (!t) return null;
  const kids = e.nd.k.map(n => ({ i: tfBack(t, n.m), n, black: ms.length % 2 === 0 })).filter(k => k.i >= 0 && !ms.includes(k.i));
  return { o: e.o, t, nd: e.nd, depth: ms.length - 3, inBook: true, via: e.o, kids, node: null };
}
// 定式说明里写着这手不好（对下这手的一方而言）
export const isBad = k => k.n.q === -1;
export const isBook = k => !!k.n.b;
export const kDepth = n => n.y || (n.y = 1 + n.k.reduce((d, c) => Math.max(d, kDepth(c)), 0));
export const kSize = n => n.z || (n.z = 1 + n.k.reduce((s, c) => s + kSize(c), 0));   // 这一手后面谱上记了多少变化
export const moverWR = k => (k.n.w != null ? (k.black ? k.n.w : 100 - k.n.w) : null);   // 这手之后，下这手的一方的胜率
// 给当前局面的谱上下法排序：好的定式在前（按 AI 评估），AI 首选紧随其后
export function rankKids(st) {
  if (!st || !st.inBook) return [];
  const sc = k => {
    let s = 0;
    if (isBook(k) && !isBad(k)) s += 1000;
    if (k.n.q === 1) s += 120;
    if (k.n.a === 2) s += 300; else if (k.n.a === 1) s += 150;
    if (isBad(k)) s -= 800;
    const w = moverWR(k); s += w == null ? 40 : w;
    s += Math.min(300, 30 * Math.log2(kSize(k.n)));                // 谱上研究得越多的，一般越是正着
    return s;
  };
  return st.kids.slice().sort((p, q) => sc(q) - sc(p));
}
// 提示用的前几手：最多两手定式，再补上 AI 首选
export function adviceList(st) {
  let r = rankKids(st);
  const ws = r.map(moverWR).filter(w => w != null), top = ws.length ? Math.max(...ws) : null;
  if (top != null) r = r.filter(k => { const w = moverWR(k); return w == null || w >= top - 20; });   // AI 看来明显吃亏的不推荐
  const out = [];
  for (const k of r) if (isBook(k) && !isBad(k) && out.length < 2) out.push(k);
  const ai = r.find(k => k.n.a === 2); if (ai && !out.includes(ai)) out.push(ai);
  for (const k of r) { if (out.length >= 3) break; if (!out.includes(k) && !isBad(k)) out.push(k); }
  return out.slice(0, 3).filter(k => b[k.i] === 0);
}
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const short = t => String(t).split('；')[0];      // 说明只取第一句
export function moveName(k, i) { return `${k % 2 === 0 ? '黑' : '白'}${k + 1} ${coord(i)}`; }
// 电脑按谱下：从谱上较好的几手里挑一手（有一点随机，免得每盘都一样）；谱上没有就返回 -1
export function bookMoveForAI(ms) {
  // 开局前三手：走成一种标准开局
  if (ms.length === 1 && ms[0] === CENTER) { const t = T8[(Math.random() * 8) | 0], w = Math.random() < 0.5 ? jkAbs(0, 1) : jkAbs(1, 1); return tfBack(t, w); }
  if (ms.length === 2 && ms[0] === CENTER) {
    for (const t of T8) {
      const w = tfTo(t, ms[1]), k = w === jkAbs(0, 1) ? 'D' : w === jkAbs(1, 1) ? 'I' : '';
      if (!k) continue;
      const pool = OPENINGS.filter(o => o.k === k && !/白/.test(OP_EV[o.ev][0])), o = pool[(Math.random() * pool.length) | 0];
      const i = tfBack(t, opMoves(o)[2]); if (i >= 0 && b[i] === 0) return i;
    }
    return -1;
  }
  const st = bookState(ms); if (!st || !st.inBook || !st.kids.length) return -1;
  const r = rankKids(st).filter(k => !isBad(k) && b[k.i] === 0);
  if (!r.length) return -1;
  const top = r.slice(0, 3), wts = [0.6, 0.25, 0.15].slice(0, top.length);
  let x = Math.random() * wts.reduce((a2, c) => a2 + c, 0);
  for (let j = 0; j < top.length; j++) { x -= wts[j]; if (x <= 0) return top[j].i; }
  return top[0].i;
}
export const aiFollowsBook = () => !PVP() && !!S.practice;
/* 对局中不再显示开局小标签（“xx局 · 定式中”），开局名由陪练介绍，想看谱去定式页 */

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  setTimeout(() => { if (!POSIX) buildPosIndex(); }, 2500);
}
