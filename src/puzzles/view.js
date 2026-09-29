/* 杀法页要显示的东西：从 PZ（puzzles.js）算出来，给 components/puzzle/ 下的组件用 */
import { PUZZLES } from '../data/puzzles.js';
import { N } from '../engine/engine.js';
import { coord } from '../ui/sound.js';
import { PZ, PZREC, PZ_LV, cName, pzGrade, pzLevel, pzP } from './puzzles.js';

const GRADE = { perfect: '一次解开', done: '解开过', seen: '看过答案' };
const XY = i => [(i % N) + 1, ((i / N) | 0) + 1];

export function pzListView() {
  return {
    done: PUZZLES.filter(p => PZREC[p.id] && PZREC[p.id].g !== 'seen').length,
    perfect: PUZZLES.filter(p => PZREC[p.id] && PZREC[p.id].g === 'perfect').length,
    total: PUZZLES.length,
    levels: PZ_LV.map(([name], lv) => ({
      name,
      items: PUZZLES.map((p, k) => ({ p, k })).filter(({ p }) => pzLevel(p) === lv).map(({ p, k }) => {
        const r = PZREC[p.id], g = pzGrade(r);
        return { k, g, on: k === PZ.k, title: `第 ${k + 1} 题 · ${cName(p.a)}先 · 最短 ${(p.len + 3) / 2} 手杀${r ? ' · ' + { perfect: '一次解开', done: '已解开', seen: '看过答案' }[g] : ''}` };
      }),
    })),
  };
}

// 棋盘上盖的一层：提示的绿圈、走错的红叉、解开后的五连线
function pzMarks() {
  const v = { hint: null, flash: null, win: null, winx: null };
  if (PZ.hint >= 0 && !PZ.over) { const [x, y] = XY(PZ.hint); v.hint = { x, y }; }
  const cross = (x, y, s) => `M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`;
  if (PZ.flash) { const [x, y] = XY(PZ.flash.i); v.flash = { x, y, d: cross(x, y, 0.18) }; }
  if (PZ.over && PZ.win) {
    const w = PZ.win;
    if (w.line) { const [x1, y1] = XY(w.line[0]), [x2, y2] = XY(w.line[1]); v.win = { x1, y1, x2, y2, seen: PZ.seen }; }
    if (w.forb >= 0) { const [x, y] = XY(w.forb); v.winx = { x, y, d: cross(x, y, 0.2) }; }
  }
  return v;
}

export function pzView() {
  const p = pzP(), A = p.a, r = PZREC[p.id], g = pzGrade(r);
  return {
    k: PZ.k, total: PUZZLES.length, last: PUZZLES.length - 1, A: cName(A), D: cName(3 - A), black: A === 1,
    lv: PZ_LV[pzLevel(p)][0], steps: (p.len + 3) / 2, badge: r ? { g, text: GRADE[g] } : null,
    msg: PZ.msg ? { ...PZ.msg, solved: PZ.msg.kind === 'win' && !PZ.seen } : null,
    moves: PZ.att.map((m, k) => ({ no: k + 1, c: coord(m), cls: (k % 2 === 0 ? 'book' : '') + (k === PZ.att.length - 1 ? ' cur' : '') })),
    mine: PZ.att.length ? `${cName(A)}棋 ${Math.ceil(PZ.att.length / 2)} 手` : '',
    over: PZ.over, busy: !!PZ.busy, canReset: !!(PZ.att.length || PZ.over),
    marks: pzMarks(),
  };
}
