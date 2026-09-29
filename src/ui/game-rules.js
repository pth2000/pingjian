/* ---- 对局流程 ---- */
import { DX, DY, N, OPPONENTS, RULE, b, cands, exactFor, inb, isForbidden } from '../engine/engine.js';
import { S, diffOf, oppOf, savePrefs } from './state.js';
import { PVP, toMove } from './sound.js';

export function winLineAt(i, c) {
  const ex = exactFor(c), x = i % N, y = (i / N) | 0;
  for (let d = 0; d < 4; d++) {
    let lo = 0, hi = 0;
    while (inb(x + DX[d] * (lo - 1), y + DY[d] * (lo - 1)) && b[(y + DY[d] * (lo - 1)) * N + x + DX[d] * (lo - 1)] === c) lo--;
    while (inb(x + DX[d] * (hi + 1), y + DY[d] * (hi + 1)) && b[(y + DY[d] * (hi + 1)) * N + x + DX[d] * (hi + 1)] === c) hi++;
    const n = hi - lo + 1;
    if (ex ? n === 5 : n >= 5) return [(y + DY[d] * lo) * N + x + DX[d] * lo, (y + DY[d] * hi) * N + x + DX[d] * hi];
  }
  return null;
}
// 盘上要标红叉的禁手点：连珠规则、轮到人执黑时才有；打开「隐藏禁手点」就不标
export function updateForb() {
  S.forb = (RULE === 'renju' && toMove() === 1 && (PVP() || S.human === 1) && !S.over && !S.hideForb) ? cands().filter(i => isForbidden(i, 0)) : [];
}
export function pickRandomOpp() {
  const cur = oppOf(S.level), pool = OPPONENTS.filter(o => o.id !== cur);
  const o = pool[(Math.random() * pool.length) | 0];
  S.level = o.id + '.' + diffOf(S.level); savePrefs();
}
