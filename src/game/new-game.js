// 开局练习：盘面上已经摆好的几手不算你下的
import { emit } from '../core/hooks.js';
import { gv } from '../stores/game-ui.js';
import { DIFF_NAME, OPP, S, diffOf, oppOf } from '../ui/state.js';
import { PVP, toMove } from '../ui/sound.js';
import { oppAvatar } from '../story/portraits.js';
import { storyLine } from '../story/story.js';
import { openingOf } from '../openings/openings.js';
import { opLabel } from '../openings/tree.js';
import { pickRandomOpp, updateForb } from '../ui/game-rules.js';
import { N, assessPosition, b, evalPoint, place, ring, threatInfo, ttClear } from '../engine/engine.js';
import { updateUI } from '../ui/panel.js';
import { aiTurn, hideCoach, hideResult } from './play.js';
import { clearSaved } from './save.js';
import { render } from '../ui/canvas.js';
import { greetLine } from './coach.js';
import { startNigiri } from './nigiri.js';
import { clearBoard, setRule } from '../engine/engine.js';
import { RULE_NAME, opWanted, startOpening } from './opening-rule.js';
import { fitRuleset } from './rulesets.js';
import { rulesetNow } from './rulesets.js';
import { setAway } from '../engine/engine.js';
import { awayOf } from './rulesets.js';
export function hasOwnMove() {
  const pn = S.presetN || 0;
  for (let k = pn; k < S.moves.length; k++) if (PVP() || (k % 2 === 0 ? 1 : 2) === S.human) return true;
  return false;
}
// 开局动画：棋盘上的旧子依次收走，然后亮出这局的对手
let introTimer = 0;
// 亮一张卡、一两秒后收起（开局规则走完时也用它说谁执黑）
export function flashIntro(card, delay = 0) {
  clearTimeout(introTimer);
  gv.intro = card; gv.introOn = false;
  introTimer = setTimeout(() => {
    gv.introOn = true; gv.introSeq++;             // 换一个新卡片，入场动画从头放
    introTimer = setTimeout(() => { gv.introOn = false; }, 1750);
  }, delay);
}
function showIntro() {
  clearTimeout(introTimer);
  gv.nigiri = null;
  if (PVP() && S.nigiri) { gv.introOn = false; startNigiri(); return; }   // 双人对弈：先猜先，开局卡就不出了（猜完再走开局规则）
  if (PVP()) gv.intro = { pvp: true, vs: '双人对弈', name: rulesetNow().short, sub: opWanted() ? `${RULE_NAME[S.openRule]} 开局，由假先方开始摆放` : '黑方先行，双方轮流落子', q: '' };
  else {
    const o = OPP[oppOf(S.level)], q = storyLine(o.id, 'greet');
    gv.intro = {
      pvp: false, face: oppAvatar(o.id), name: o.name, q: S.practice ? '' : q,
      vs: S.practice ? `开局练习 · ${(openingOf(S.practice) && opLabel(openingOf(S.practice))) || '指定局面'}` : S.randOpp ? '随机对手' : '对阵',
      sub: `${o.tag} · ${DIFF_NAME[diffOf(S.level)]} · ${opWanted() ? `${RULE_NAME[S.openRule]} 开局 · 你为${S.opFirst === 'opp' ? '假后方' : '假先方'}` : S.human === 1 ? '你执黑先行' : '你执白后行'}`,
    };
  }
  flashIntro(gv.intro, S.clearAnim ? 260 : 0);
}
export function newGame() {
  emit('newGame');
  if (S.randOpp && !PVP() && !S.keepOpp) pickRandomOpp();
  S.keepOpp = false;
  // 用开局规则时执黑执白由开局决定、会改掉 S.human；执子设置记在 S.side，不用开局规则的局照它来
  if (!S.side) S.side = S.human;
  if (!PVP() && !opWanted() && !S.practice) S.human = S.side;   // 开局练习（从定式接着下）按摆好的局面定执子
  if (S.prefRS) { S.rule = S.prefRS.rule; S.openRule = S.prefRS.open; S.prefRS = null; }   // 看完载入的棋谱，新局回到自己的规则设置
  fitRuleset('open');                               // 棋规和开局规则始终成对（旧存档里可能不成对）
  setAway(S.practice ? 0 : awayOf(S.openRule));      // Pro / Long Pro：第 3 手的距离限制
  S.token++;
  clearBoard(); ttClear();
  setRule(S.rule);
  S.kinds = []; S.mt = []; S.sty = []; S.lastMoveAt = 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  S.clearAnim = (!reduce && S.moves.length) ? { stones: S.moves.map((m, k) => [m, k % 2 === 0 ? 1 : 2]), t0: performance.now() } : null;
  Object.assign(S, { op: null, opNote: null, moves: [], settled: false, resigned: 0, over: false, winner: 0, winLine: null, winCells: [], winAnim: 0, thinking: false, hint: -1, sel: -1, t0: Date.now(), tEnd: 0, wr: [], wrNote: [], threat: null });
  const a0 = assessPosition(); S.wr[0] = a0[0]; S.wrNote[0] = a0[1];
  if (PVP()) S.practice = null;
  S.presetN = 0; S.bookLeft = null; S.opSaid = null; S.terms = {};
  if (S.practice) {                               // 开局练习：先把指定的几手摆上
    S.practice.forEach((m, k) => {
      const c = k % 2 === 0 ? 1 : 2;
      S.sty[k] = styleFeat(m, c, k ? S.practice[k - 1] : -1); place(m, c); S.moves.push(m);
      const ti = threatInfo(m, c); S.kinds[k] = ti ? ti.kind : ''; S.mt[k] = 0;
      const a = assessPosition(); S.wr[k + 1] = a[0]; S.wrNote[k + 1] = a[1];
    });
    S.presetN = S.moves.length;
    const last = S.moves[S.moves.length - 1];
    S.threat = S.showThreat ? threatInfo(last, S.moves.length % 2 === 0 ? 2 : 1) : null;
  }
 
  hideResult();
  S.review = -1; S.lesson = null; S.marks = null; S.sugg = {}; S.say = ''; S.sayLog = []; S.hints = []; S.prevThreat = null; S.pendingOk = false; hideCoach(); clearSaved();
  updateForb(); render(); updateUI();
  if (S.coach) greetLine();
  showIntro();
  if (opWanted()) { if (!gv.nigiri) startOpening(); }   // 开局规则：先按规则摆开局、定黑白（双人对弈猜完先再开始）
  else if (!PVP() && toMove() !== S.human) aiTurn();
}
export function cellsBetween(a, z) {
  const ax = a % N, ay = (a / N) | 0, zx = z % N, zy = (z / N) | 0;
  const n = Math.max(Math.abs(zx - ax), Math.abs(zy - ay)), sx = Math.sign(zx - ax), sy = Math.sign(zy - ay), out = [];
  for (let k = 0; k <= n; k++) out.push((ay + sy * k) * N + ax + sx * k);
  return out;
}
// 棋风特征：只看几何关系，不用引擎评估，对局中显示也不泄露“该下哪”
// 落子前调用：atk 自身得分占比，diag 与己子斜向相连的占比，near 是否贴着对方上一手，ring 离中心程度
export function styleFeat(i, c, last) {
  const my = Math.min(evalPoint(i, c), 5000), op = Math.min(evalPoint(i, 3 - c), 5000);
  const x = i % N, y = (i / N) | 0;
  let dg = 0, ln = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= N || yy >= N || b[yy * N + xx] !== c) continue;
    if (dx && dy) dg++; else ln++;
  }
  const nearOpp = last >= 0 ? Math.max(Math.abs(x - last % N), Math.abs(y - ((last / N) | 0))) <= 1 : null;
  return { atk: (my + 1) / (my + op + 2), dg, ln, near: nearOpp, ring: ring(i) / 7 };
}
export function styleRead(c, upto) {
  const F = S.sty || [], n = upto === undefined ? S.moves.length : upto;
  let k0 = c === 1 ? 0 : 1, cnt = 0, atk = 0, dg = 0, ln = 0, nr = 0, nn = 0, rg = 0;
  for (let k = k0; k < n; k += 2) {
    const f = F[k]; if (!f) continue;
    if (k >= 4) { cnt++; atk += f.atk; rg += f.ring; }       // 开头两手几乎是定式，不计
    dg += f.dg; ln += f.ln;
    if (f.near !== null && k >= 2) { nn++; if (f.near) nr++; }
  }
  if (cnt < 4) return null;
  return { n: cnt, atk: atk / cnt, diag: dg + ln ? dg / (dg + ln) : 0.5, near: nn ? nr / nn : 0, center: rg / cnt };
}
// 各位对手“平时”的棋风读数（对阵守中·普通的自对弈统计），守中那一行就是常见水平
export const STYLE_BASE = {"wuming":{"atk":0.451,"diag":0.446,"near":0.282,"center":0.62},"chong":{"atk":0.476,"diag":0.502,"near":0.325,"center":0.588},"laogui":{"atk":0.402,"diag":0.494,"near":0.289,"center":0.586},"xieyue":{"atk":0.285,"diag":0.502,"near":0.357,"center":0.554},"yehu":{"atk":0.452,"diag":0.522,"near":0.278,"center":0.574},"atu":{"atk":0.352,"diag":0.468,"near":0.394,"center":0.58}};
export const STYLE_AX = [                                  // [键, 左端, 右端, 满刻度]
  ['atk', '防守', '进攻', 0.16], ['diag', '横竖', '斜线', 0.16], ['near', '各下各', '贴身', 0.16], ['center', '边角', '中心', 0.12],
];
export const styX = (k, v) => { const ax = STYLE_AX.find(a => a[0] === k), c = STYLE_BASE.wuming[k]; return Math.max(3, Math.min(97, 50 + (v - c) / ax[3] * 50)); };
