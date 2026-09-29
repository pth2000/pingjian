/* ---- 提示和陪练讲谱：状态栏的提示说明、离开谱的时候记一笔、陪练在开局阶段讲谱 ---- */
import { S } from '../ui/state.js';
import { PVP, coord, myTurn } from '../ui/sound.js';
import { adviceList, bookState, esc, opLabel, opTag, short } from './tree.js';
import { renderSay } from '../game/coach.js';
import { OP_EV, openingOf } from './openings.js';

// 状态栏里的提示说明（「提示」按钮给的候选点）
export function hintLabel() {
  if ((S.hints || []).length > 1) return '提示 ' + S.hints.map((m, k) => `${k + 1}. ${coord(m)}`).join('　');
  return S.hint >= 0 ? `建议落在 ${coord(S.hint)}` : '';
}
export function sayRaw(t) { if (!S.coach) return; if (S.say) S.sayLog = [S.say, ...(S.sayLog || [])].slice(0, 6); S.say = t; renderSay(true); }
// 每走一手，看看是不是离开了谱
export function bookNotice(prevMoves) {
  if (prevMoves.length < 3 || S.rule !== 'renju') return;
  const before = bookState(prevMoves); if (!before || !before.inBook || !before.kids.length) return;
  const now = bookState(S.moves), k = S.moves.length - 1;
  if (now && now.inBook) return;
  const alts = adviceList(before).map(q => coord(q.i)).join('、');
  const who = PVP() ? `${k % 2 === 0 ? '黑' : '白'}棋` : ((k % 2 === 0 ? 1 : 2) === S.human ? '你' : '对手');
  S.bookLeft = { k, m: S.moves[k], who, alts, said: false };
}
// 陪练在开局阶段讲谱：返回这次是否说了话（说了就不再做普通点评）
export function coachOpening() {
  if (!S.coach || S.moves.length < 3 || S.rule !== 'renju') return false;   // 开局名称、理论评价和定式都是连珠的，别的棋规不讲
  const o = openingOf(S.moves); if (!o) return false;
  const n = S.moves.length, parts = [];
  // 开局名称：陪练开着就介绍一次（双人对弈也说）
  if (S.opSaid !== o.id) { S.opSaid = o.id; parts.push(`这盘是${opLabel(o)}（${opTag(o)}），理论上${OP_EV[o.ev][0]}。${o.k === 'D' ? '白 2 紧贴黑 1 下，叫“直指”。' : '白 2 下在黑 1 斜角，叫“斜指”。'}`); }
  if (PVP()) { if (parts.length) { sayRaw(parts.join('')); return true; } return false; }
  const L = S.bookLeft;
  if (L && !L.said) {
    L.said = true;
    parts.push(L.who === '你' ? `你第 ${L.k + 1} 手 ${coord(L.m)} 离开了谱${L.alts ? `，谱上是 <b>${L.alts}</b>` : ''}。不一定是坏棋，但往后就没有现成的套路了。` : `对手第 ${L.k + 1} 手 ${coord(L.m)} 走出了谱，接下来得靠自己算。`);
  } else if (n > 3 && !L) {
    const st = bookState(S.moves), last = n - 1, lastOpp = (last % 2 === 0 ? 1 : 2) !== S.human;
    if (st && st.inBook && lastOpp && st.node) {
      const nd = st.node;
      parts.push(nd.b ? `对手这手 ${coord(S.moves[last])} 是定式${nd.t ? `：${esc(short(nd.t))}` : ''}。` : `对手这手 ${coord(S.moves[last])} 是开局库里的正着。`);
      if (!st.kids.length) parts.push('谱到这里就没有了，接下来靠你自己。');
      else if (myTurn()) parts.push('这一手谱上有现成的下法，下完可以去定式页对照。');
    }
  }
  if (!parts.length) return false;
  sayRaw(parts.join(''));
  return true;
}