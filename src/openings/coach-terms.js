/* ---- 陪练讲棋形：每盘第一次出现时说一句是什么意思（只在陪练开着时）。连珠讲禁手，标准五子棋讲长连不算赢 ---- */
import { S, diffOf } from '../ui/state.js';
import { PVP } from '../ui/sound.js';
import { sayRaw } from './hints.js';
import { RULE } from '../engine/engine.js';
import { N, b } from '../engine/engine.js';

const TERMS = {
  live3: '「活三」：三子连成一线（或中间空一格），两头都空着，再补一手就是活四，对方一般得马上挡。',
  rush4: '「冲四」：四子一线，只剩一个点能连成五，对方必须挡住这个点，别的都顾不上。',
  live4: '「活四」：四子一线、两头都空，有两个点能连成五，对方只挡得住一头——出现活四就赢定了。',
  four3: '「四三」：一手同时做出冲四和活三。对方挡了四就挡不了三，是最常见的取胜手段。',
  double3: '「双活三」：一手同时做出两个活三，对方挡不过来。白棋可以这样赢；连珠规则下黑棋下三三是禁手。',
};
const TERM_OVER = '「长连」：六子或更多连成一线。标准五子棋只认恰好五子，长连不算赢，棋局照常继续。';
// 刚落的这手连出了六子以上
function overlineAt(m) {
  const c = b[m], x0 = m % N, y0 = (m / N) | 0;
  const run = (dx, dy) => { let n = 0; for (let k = 1; k < 6; k++) { const x = x0 + dx * k, y = y0 + dy * k; if (x < 0 || y < 0 || x >= N || y >= N || b[y * N + x] !== c) break; n++; } return n; };
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dx, dy]) => 1 + run(dx, dy) + run(-dx, -dy) >= 6);
}
const TERM_FORBID = '棋盘上的红叉是黑棋的「禁手」点：连珠规则下黑棋不能下三三、四四和长连（六子以上），白棋没有限制。';
export function coachTerm() {
  if (!S.coach || S.over) return false;
  if (!PVP() && diffOf(S.level) === 'master') return false;   // 大师难度不讲名词
  S.terms = S.terms || {};
  const n = S.moves.length;
  for (const k of PVP() ? [n - 1] : [n - 1, n - 2]) {
    if (k < 0) continue;
    const kind = S.kinds && S.kinds[k];
    if (!kind || !TERMS[kind] || S.terms[kind]) continue;
    S.terms[kind] = 1;
    const c = k % 2 === 0 ? 1 : 2, who = PVP() ? `${c === 1 ? '黑' : '白'}棋` : c === S.human ? '你' : '对手';
    sayRaw(`${who}${k === n - 1 ? '这手' : '上一手'}下出了${TERMS[kind]}`);
    return true;
  }
  if (!S.terms.over && RULE === 'std') for (const k of PVP() ? [n - 1] : [n - 1, n - 2]) {
    if (k < 0 || !overlineAt(S.moves[k])) continue;
    S.terms.over = 1;
    const c = k % 2 === 0 ? 1 : 2, who = PVP() ? `${c === 1 ? '黑' : '白'}棋` : c === S.human ? '你' : '对手';
    sayRaw(`${who}${k === n - 1 ? '这手' : '上一手'}连成了${TERM_OVER}`); return true;
  }
  if (!S.terms.forbid && RULE === 'renju' && (S.forb || []).length) { S.terms.forbid = 1; sayRaw(TERM_FORBID); return true; }
  return false;
}