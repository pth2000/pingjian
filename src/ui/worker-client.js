/* ---- 后台线程：引擎打包成内联 Worker（Vite 的 ?worker&inline），开不起来就回退主线程 ---- */
import { S } from './state.js';
import EngineWorker from '../engine/worker.js?worker&inline';
import { AWAY, RULE } from '../engine/engine.js';

export let WK = null, wkReady = false;
let wkSeq = 0;
let wkPending;
let wkMode = 'main';
function bootWorker(makers) {
  if (!makers.length) { WK = null; wkReady = false; wkMode = 'main'; return; }
  const [mode, make] = makers[0];
  let w, done = false;
  const next = () => { if (done) return; done = true; try { w && w.terminate(); } catch (e) {} bootWorker(makers.slice(1)); };
  Promise.resolve().then(make).then(x => {
    w = x;
    const t = setTimeout(next, 2500);
    w.onmessage = e => {
      const d = e.data || {};
      if (d.type === 'ready') { if (!done) { done = true; clearTimeout(t); WK = w; wkReady = true; wkMode = mode; } return; }
      const cb = wkPending.get(d.id);
      if (cb) { wkPending.delete(d.id); cb(d); }
    };
    w.onerror = ev => { if (!done) { ev.preventDefault && ev.preventDefault(); clearTimeout(t); next(); } else { wkReady = false; WK = null; wkMode = 'main'; wkPending.forEach(cb => cb(null)); wkPending.clear(); } };
  }).catch(next);
}
// 等浏览器把刚落的子画出来再开始算，主线程回退时也不会“点了没反应”
export const nextPaint = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
export function wkCall(msg, budget) {
  return new Promise(res => {
    if (!WK || !wkReady) return res(null);
    const id = ++wkSeq;
    const timer = setTimeout(() => { if (wkPending.has(id)) { wkPending.delete(id); res(null); } }, budget);
    wkPending.set(id, d => { clearTimeout(timer); res(d && d.type === 'error' ? null : d); });
    // 转一道 JSON：消息里可能带着响应式数据（Proxy），不能直接发给后台线程
    try { WK.postMessage(JSON.parse(JSON.stringify(Object.assign({ id, rule: RULE, away: msg.rule ? 0 : AWAY, moves: S.moves.slice() }, msg)))); }
    catch (e) { wkPending.delete(id); clearTimeout(timer); res(null); }
  });
}

/* ---- 启动：开后台线程 ---- */
export function __init() {
  wkPending = new Map();
  bootWorker([['inline', () => new EngineWorker()]]);
}
