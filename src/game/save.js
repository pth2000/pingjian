/* ---- 保存、恢复与棋谱代码 ---- */
import { emit } from '../core/hooks.js';
import { S, normLevel } from '../ui/state.js';
import { NN, place, threatInfo } from '../engine/engine.js';
import { cellsBetween, styleFeat } from './new-game.js';
import { rebuildBoard } from './review.js';
import { updateForb, winLineAt } from '../ui/game-rules.js';
import { render } from '../ui/canvas.js';
import { scheduleAssess, updateUI } from '../ui/panel.js';
import { PVP, toMove } from '../ui/sound.js';
import { aiTurn } from './play.js';
import { load, remove, save } from '../core/storage.js';
import { clearBoard, setRule } from '../engine/engine.js';
import { opResume } from './opening-rule.js';
import { fitRuleset } from './rulesets.js';
import { setAway } from '../engine/engine.js';
import { awayOf } from './rulesets.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function encodeGame() {
  let out = ({ renju: 'R', free: 'F', std: 'S' })[S.rule] || 'R';   // 棋谱代码首字母：R 连珠、F 无禁手、S 标准五子棋
  for (const m of S.moves) out += B64[(m >> 6) & 63] + B64[m & 63];
  return out;
}
export function decodeGame(code) {
  const t = (code || '').trim().replace(/\s+/g, '');
  if (!/^[RFS]([A-Za-z0-9_-]{2})*$/.test(t)) return null;
  const moves = [], seen = new Set();
  for (let k = 1; k < t.length; k += 2) {
    const m = (B64.indexOf(t[k]) << 6) | B64.indexOf(t[k + 1]);
    if (m < 0 || m >= NN || seen.has(m)) return null;
    seen.add(m); moves.push(m);
  }
  return { rule: ({ R: 'renju', F: 'free', S: 'std' })[t[0]], moves };
}
export function saveGame() {
  save('game', {
    m: S.moves, r: S.rule, or: S.openRule, md: S.mode, h: S.human, lv: S.level, pn: S.presetN || 0, pr: S.practice || null,
    ov: S.over, w: S.winner, st: S.settled ? 1 : 0, rs: S.resigned || 0, op: S.op ? { rule: S.op.rule, step: S.op.step, black: S.op.black, ai: S.op.ai, n: S.op.n, offers: S.op.offers.slice() } : null, wr: S.wr.map(x => (x === undefined ? null : Math.round(x))), t: Date.now(),
  });
}
export const clearSaved = () => remove('game');
export function loadGame(moves, opts = {}) {
  S.token++;
  S.op = opts.op ? Object.assign({ busy: false, mine: false }, opts.op) : null;   // 开局规则摆到一半的存档
  S.opNote = null;
  setAway(S.practice ? 0 : awayOf(S.openRule));
  S.moves = moves.slice();
  S.presetN = Math.min(opts.pn || 0, S.moves.length); S.bookLeft = null; S.opSaid = null; S.terms = {};
  // 重放一遍，补出每手的棋形（用时无从得知，留空）
  clearBoard(); S.kinds = []; S.mt = []; S.sty = [];
  S.moves.forEach((m, k) => { const c = k % 2 === 0 ? 1 : 2; S.sty[k] = styleFeat(m, c, k ? S.moves[k - 1] : -1); place(m, c); const ti = threatInfo(m, c); S.kinds[k] = ti ? ti.kind : ''; });
  rebuildBoard();
  Object.assign(S, {
    review: -1, thinking: false, hint: -1, sel: -1, sugg: {}, threat: null,
    over: false, winner: 0, winLine: null, winCells: [], winAnim: 0, resigned: 0,
    settled: !!opts.settled,           // 这盘已经记过结果（下完过、历史棋局、载入的棋谱）：接着下不再记战绩
    wr: opts.wr || [], wrNote: [], t0: Date.now() - (opts.elapsed || 0), tEnd: 0,
  });
  // 重新判断终局
  if (S.moves.length) {
    const last = S.moves[S.moves.length - 1], c = S.moves.length % 2 === 0 ? 2 : 1;
    const w = winLineAt(last, c);
    if (w) { S.over = true; S.winner = c; S.winLine = w; S.winCells = cellsBetween(w[0], w[1]); }
    else if (S.moves.length === NN) { S.over = true; S.winner = 0; }
    if (!S.over && S.showThreat) S.threat = threatInfo(last, c);
  }
  if (!S.over && (opts.rs === 1 || opts.rs === 2)) { S.over = true; S.winner = 3 - opts.rs; S.resigned = opts.rs; }   // 认输结束的，盘面上看不出来
  if (S.over) S.tEnd = Date.now();
  emit('loaded');
  updateForb(); render(); updateUI();
  if (S.op && !S.over) opResume();
  else if (!S.over && !PVP() && toMove() !== S.human) aiTurn();
  else if (!S.over && S.wr[S.moves.length] === undefined) scheduleAssess();
}
export function restoreSaved() {
  let g = null;
  g = load('game');
  if (!g || !Array.isArray(g.m) || !g.m.length) return false;
  if (g.md && g.md !== 'ai' && g.md !== 'pvp') { remove('game'); return false; }   // 闯关 / 故事模式的残局不再恢复
  if (['renju', 'free', 'std'].includes(g.r)) { S.rule = g.r; S.openRule = g.or || 'free'; fitRuleset('rule'); }   // 设置页的控件跟着 S 走
  if (g.md === 'ai' || g.md === 'pvp') S.mode = g.md;
  if (g.h === 1 || g.h === 2) S.human = g.h;
  if (normLevel(g.lv)) { S.level = normLevel(g.lv); }
  setRule(S.rule);
  S.practice = Array.isArray(g.pr) && g.pr.length ? g.pr : null;
  loadGame(g.m, { wr: (g.wr || []).map(x => (x === null ? undefined : x)), pn: g.pn || 0, op: g.op && g.op.step ? g.op : null, settled: !!g.st || !!g.ov, rs: g.rs || 0 });
  return true;
}
