/* 后台线程入口（ES 模块）：主线程发来局面，这里用同一份引擎算完回传。
   构建时 Vite 把它连同引擎打包成内联 Worker（见 ui/worker-client.js）。 */
import { CFG, assessPosition, clearBoard, coachCheck, nodes, place, pvLine, setAway, setRule, think, topMoves, ttClear, vcfLine } from './engine.js';

let lastRule = null;
function setup(moves, rule) {
  if (rule !== lastRule) { ttClear(); lastRule = rule; }
  setRule(rule);
  clearBoard();
  for (let k = 0; k < moves.length; k++) place(moves[k], k % 2 === 0 ? 1 : 2);
}
self.onmessage = function (e) {
  const d = e.data || {};
  try {
    if (d.type === 'ping') { self.postMessage({ id: d.id, type: 'ready' }); return; }
    setup(d.moves || [], d.rule || 'renju');
    setAway(d.away || 0);
    if (d.type === 'think') {
      const cfg = Object.assign({}, CFG[d.level] || CFG.normal, d.cfg || {});
      self.postMessage({ id: d.id, type: 'move', move: think(d.color, cfg), nodes });
    } else if (d.type === 'turn') {
      // 对手的一整个回合：先评估你这手之后的形势，再想棋，再评估它落子之后的形势——全都算在"思考"里
      const cfg = Object.assign({}, CFG[d.level] || CFG.normal, d.cfg || {});
      let wr0 = null, wr1 = null;
      if (d.wr0) { try { wr0 = assessPosition(); } catch (e2) {} }
      const move = think(d.color, cfg);
      const n0 = nodes;
      if (d.wr && move >= 0) { try { place(move, d.color); wr1 = assessPosition(); } catch (e2) {} }
      self.postMessage({ id: d.id, type: 'move', move, nodes: n0, wr0, wr1 });
    } else if (d.type === 'coach') {
      self.postMessage({ id: d.id, type: 'coach', res: coachCheck(d.color, d.cand) });
    } else if (d.type === 'top') {
      self.postMessage({ id: d.id, type: 'top', list: topMoves(d.color, d.k || 3) });
    } else if (d.type === 'pv') {
      self.postMessage({ id: d.id, type: 'pv', line: pvLine(d.color, d.n || 8) });
    } else if (d.type === 'vcf') {
      const r = vcfLine(d.color, d.ms || 3000);
      self.postMessage({ id: d.id, type: 'vcf', seq: r.seq, done: r.done });
    } else if (d.type === 'assess') {
      const [p, note] = assessPosition();
      self.postMessage({ id: d.id, type: 'assess', p, note });
    }
  } catch (err) {
    self.postMessage({ id: d.id, type: 'error', message: String(err && err.message || err) });
  }
};
self.postMessage({ type: 'ready' });
