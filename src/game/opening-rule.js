/* ---- 开局规则（开局阶段要双方摆子、交换的几种） ----
   Swap（配标准五子棋）：假先方摆前三手（黑白黑）；假后方选择执子。
   Swap2（五子棋世锦赛，2009 年起）：假先方摆前三手；假后方选执白（并下第 4 手）、执黑，或再摆两子（白黑）由假先方选执子。
   RIF 规则（连珠世锦赛 1996–2008）：假先方摆出 26 种开局之一；假后方可交换；白方下第 4 手；黑方摆 2 个第 5 手打点；白方选定其一。
   山口规则（2009–2015）：假先方摆出开局并声明打点数 N；假后方可交换；白方下第 4 手；黑方摆 N 个打点；白方选定其一。
   索索夫-8（2017 年起）：假先方摆出开局；假后方可交换；白方下第 4 手并声明打点数（1–8）；黑方可交换；黑方摆打点；白方选定其一。
   塔拉古奇-10：第 1 手在天元，第 2、3、4 手依次限在中心 3×3、5×5、7×7 内，每下一手对方都可交换；
     之后黑方选择在中心 9×9 内下第 5 手，或摆出 10 个打点由白方选定。
   哪种规则配哪种棋规由 game/rulesets.js 管；Pro / Long Pro 不走这里（只限制第 3 手的位置）。
   开局阶段 S.op 不为空，棋盘点击由 opClick 接管，按钮由 opChoose / opDeclare 接管；走完 finish() 才进入正常对局。
   代码里 A = 假先方、B = 假后方。人机对弈里 S.op.ai 记着对手是哪一方；双人对弈里由猜先决定谁是假先方。
   开局卡是 OpeningCard.vue。 */
import { S, LEVEL_NAME, oppOf } from '../ui/state.js';
import { PVP, coord } from '../ui/sound.js';
import { CENTER, N, assessPosition, b, isForbidden, symKey, think, topMoves, withBoard, ADVICE_CFG } from '../engine/engine.js';
import { aiTurn, play } from './play.js';
import { render } from '../ui/canvas.js';
import { updateUI } from '../ui/panel.js';
import { wkCall } from '../ui/worker-client.js';
import { toast } from '../ui/dialogs.js';
import { saveGame } from './save.js';
import { OPENINGS, T8, opMoves } from '../openings/openings.js';
import { flashIntro } from './new-game.js';
import { oppAvatar } from '../story/portraits.js';
import { RULE } from '../engine/engine.js';
import { SWAP_OPENS } from './rulesets.js';
import { rebuildBoard } from './review.js';

export const RULE_NAME = { swap1: 'Swap', swap2: 'Swap2', rif: 'RIF 规则', yama: '山口规则', ss8: '索索夫-8', tara: '塔拉古奇-10' };
// 这一局要不要走开局阶段：开局练习不走
export const opWanted = () => !S.practice && SWAP_OPENS.has(S.openRule);
const BOARD = new Set(['place3', 'place2', 'open', 'fourth', 'offer', 'pick', 'tmove', 'tfive']);   // 这几步要点棋盘，其余点按钮
const RENJU_OPEN = new Set(['rif', 'yama', 'ss8']);        // 先摆 26 种标准开局之一的几种
const other = p => (p === 'A' ? 'B' : 'A');
const xy = i => [i % N - 7, ((i / N) | 0) - 7];
const dist = i => Math.max(Math.abs(i % N - 7), Math.abs(((i / N) | 0) - 7));   // 与天元相距几路
const toMoveC = () => (S.moves.length % 2 === 0 ? 1 : 2);
const holder = c => (c === 1 ? S.op.black : other(S.op.black));                 // 执 c 色的是哪一方
const CN = c => (c === 1 ? '黑' : '白');

// 这一步该谁：A（假先方）还是 B（假后方）
function actor() {
  const o = S.op, white = o.black ? other(o.black) : null;
  switch (o.step) {
    case 'tswap': case 'tmove': return holder(toMoveC());
    case 'tchoice': case 'tfive': return o.black;
  }
  return { place3: 'A', choose: 'B', place2: 'B', choose2: 'A', open: 'A', declareA: 'A', swap1: 'B', fourth: white, declare: white, swap2: o.black, offer: o.black, pick: white }[o.step];
}
const aiActs = () => !!S.op && !PVP() && actor() === S.op.ai;
// 称呼：双人对弈叫假先方 / 假后方；人机对弈叫「你」和对手的名字
const partyName = p => (PVP() ? (p === 'A' ? '假先方' : '假后方') : p === S.op.ai ? LEVEL_NAME[S.level] : '你');

/* ---- 开始、结束 ---- */
export function startOpening() {
  const rule = S.openRule, fixed = RENJU_OPEN.has(rule) || rule === 'tara';
  S.op = { rule, step: RENJU_OPEN.has(rule) ? 'open' : rule === 'tara' ? 'tswap' : 'place3', black: fixed ? 'A' : null,
    ai: PVP() ? null : S.opFirst === 'opp' ? 'A' : 'B', n: rule === 'rif' ? 2 : 0, offers: [], busy: false };
  if (fixed) play(CENTER);                          // 第 1 手在天元
  next();
}
// 摆完开局、第 4 手之后各规则往哪一步走
const afterOpen = () => go(S.op.rule === 'yama' ? 'declareA' : 'swap1');
const afterFourth = () => go(S.op.rule === 'ss8' ? 'declare' : 'offer');
const afterTswap = () => (S.moves.length >= 5 ? finish() : go(S.moves.length < 4 ? 'tmove' : 'tchoice'));
function finish() {
  const o = S.op;
  if (!PVP()) S.human = o.black === o.ai ? 2 : 1;
  S.op = null; S.marks = null;
  S.presetN = S.moves.length;                       // 开局摆下的几手算定下来的局面：悔棋只能悔到这里
  const n = S.moves.length + 1, next = n % 2 === 1 ? 1 : 2;
  const who = PVP() ? `${partyName(o.black)}执黑，${partyName(other(o.black))}执白` : `你执${S.human === 1 ? '黑' : '白'}`;
  const turn = PVP() ? `${next === 1 ? '黑' : '白'}方下第 ${n} 手` : next === S.human ? `请下第 ${n} 手` : `${LEVEL_NAME[S.level]}下第 ${n} 手`;
  S.opNote = { n: S.moves.length, text: `开局结束。${o.why ? o.why + '，' : ''}${who}。${turn}。` };
  flashIntro({ pvp: PVP(), face: PVP() ? '' : oppAvatar(oppOf(S.level)), vs: `${RULE_NAME[o.rule]} · 开局结束`, name: who, sub: `${o.why ? o.why + '。' : ''}${turn}。`, q: '' });
  saveGame(); render(); updateUI();
  const tk = S.token;
  if (!PVP() && !S.over && next !== S.human) setTimeout(() => { if (tk === S.token && !S.op && !S.over && (S.moves.length % 2 === 0 ? 1 : 2) !== S.human && !S.thinking) aiTurn(); }, 900);
}
// 换一步：轮到对手就让它想，轮到人就等点击 / 按钮
function go(step) { S.op.step = step; next(); }
function next() {
  const o = S.op;
  S.sel = -1;
  o.mine = !aiActs() && !o.busy && BOARD.has(o.step);
  if (!PVP()) S.human = (o.black || 'A') === o.ai ? 2 : 1;   // 对局卡上先按眼下（暂定）的黑白显示
  saveGame(); render(); updateUI();
  if (aiActs() && !o.busy) {
    o.busy = true; updateUI();
    const tk = S.token;                              // 等的这会儿开了新局，这一步就作废
    setTimeout(() => aiStep(tk), S.moves.length <= 1 && o.step !== 'offer' ? 1500 : 450);   // 刚开局：等对手的亮相卡收起来
  }
}
// 读档回来接着走（save.js）
// 对手摆开局摆到一半时刷新：它摆的那几颗是按一套开局摆的，接不上，收回来重摆
export function opResume() {
  const o = S.op; if (!o) return;
  o.busy = false; o.mine = false;
  const keep = o.step === 'open' ? 1 : 0;
  if (aiActs() && (o.step === 'place3' || o.step === 'open') && S.moves.length > keep) {
    S.moves.length = keep; S.kinds.length = Math.min(S.kinds.length, keep); S.sty.length = Math.min(S.sty.length, keep); S.mt.length = Math.min(S.mt.length, keep);
    S.wr.length = Math.min(S.wr.length, keep + 1); S.wrNote.length = S.wr.length; rebuildBoard(); S.threat = null;
  }
  next();
}

/* ---- 人的操作：点棋盘 ---- */
export function opClick(i) {
  const o = S.op;
  if (!o || o.busy || aiActs() || b[i] !== 0) return;
  const n = S.moves.length, c = n % 2 === 0 ? 1 : 2;
  const blackBad = j => S.rule === 'renju' && isForbidden(j, 0);
  switch (o.step) {
    case 'place3': case 'place2':
      if (c === 1 && blackBad(i)) return toast('这是黑棋的禁手点，不能落子');
      play(i);
      if (o.step === 'place3' && S.moves.length === 3) go('choose');
      else if (o.step === 'place2' && S.moves.length === 5) go('choose2');
      else next();
      return;
    case 'open': {
      const [x, y] = xy(i);
      if (n === 1 && Math.max(Math.abs(x), Math.abs(y)) !== 1) return toast('第 2 手须与天元直接相邻');
      if (n === 2 && Math.max(Math.abs(x), Math.abs(y)) > 2) return toast('第 3 手须在以天元为中心的 5×5 范围内');
      play(i);
      if (S.moves.length === 3) afterOpen(); else next();
      return;
    }
    case 'fourth':
      play(i); afterFourth(); return;
    case 'tmove': case 'tfive': {                    // 塔拉古奇：第 k 手限在中心 (2k-1)×(2k-1) 内，第 5 手限在 9×9 内
      const r = o.step === 'tfive' ? 4 : n;
      if (dist(i) > r) return toast(`第 ${n + 1} 手须在以天元为中心的 ${2 * r + 1}×${2 * r + 1} 范围内`);
      if (c === 1 && blackBad(i)) return toast('这是黑棋的禁手点，不能落子');
      play(i);
      return go('tswap');                           // 每下一手（含 9×9 内的第 5 手），对方都可交换
    }
    case 'offer': {
      const at = o.offers.indexOf(i);
      if (at >= 0) { o.offers.splice(at, 1); next(); return; }     // 点已经摆的打点：收回
      if (blackBad(i)) return toast('禁手点不能作为打点');
      const k = symKey(i);
      if (o.offers.some(j => symKey(j) === k)) return toast('此处与已摆出的打点对称，不能作为打点');
      o.offers.push(i);
      if (o.offers.length === o.n) go('pick'); else next();
      return;
    }
    case 'pick':
      if (!o.offers.includes(i)) return toast('请从已摆出的打点中选定第 5 手');
      pickOffer(i);
  }
}
// 点在已有的打点上也要能收回 / 挑中：画布上那一点有虚子但棋盘是空的，所以 b[i] === 0，上面已经放行
function pickOffer(i) { const o = S.op; o.offers = []; o.mine = false; o.why = `${partyName(other(o.black))}选定 ${coord(i)} 为第 5 手`; play(i); finish(); }

/* ---- 人的操作：按钮 ---- */
export function opChoose(v) {
  const o = S.op;
  if (!o || o.busy || aiActs()) return;
  const me = partyName(actor());
  // 人自己选的执子，开局结束的提示里已经说了「你执黑」，不再重复谁选的
  const why = PVP() ? `${me}选择执${v === 'black' ? '黑' : '白'}` : '';
  if (o.step === 'choose') { if (v === 'more' && o.rule === 'swap2') return go('place2'); o.black = v === 'black' ? 'B' : 'A'; o.why = why; return finish(); }
  if (o.step === 'choose2') { o.black = v === 'black' ? 'A' : 'B'; o.why = why; return finish(); }
  if (o.step === 'swap1') { o.black = v === 'black' ? 'B' : 'A'; return go('fourth'); }
  if (o.step === 'swap2') { if (v === 'swap') o.black = other(o.black); return go('offer'); }
  if (o.step === 'tswap') { if (v === 'swap') o.black = other(o.black); return afterTswap(); }
  if (o.step === 'tchoice') { if (v === 'ten') { o.n = 10; return go('offer'); } return go('tfive'); }
}
export function opDeclare(n) {
  const o = S.op; if (!o || o.busy || aiActs()) return;
  if (o.step === 'declare') { o.n = n; go('swap2'); }
  else if (o.step === 'declareA') { o.n = n; go('swap1'); }
}

/* ---- 对手（人机对弈）：每一步怎么选 ---- */
// 形势：黑棋胜率（0–100）。后台线程算，算不了就在主线程算
async function blackP(moves) {
  const r = await wkCall({ type: 'assess', moves }, 4000);
  return r && typeof r.p === 'number' ? r.p : withBoard(moves, () => assessPosition()[0], RULE);
}
async function bestMove(moves, color) {
  const r = await wkCall({ type: 'think', level: 'hard', cfg: ADVICE_CFG, color, moves }, 6000);
  return r && r.move >= 0 ? r.move : withBoard(moves, () => think(color, ADVICE_CFG), RULE);
}
async function topFor(moves, color, k) {
  const r = await wkCall({ type: 'top', color, k, moves }, 6000);
  return (r && r.list) || withBoard(moves, () => topMoves(color, k), RULE);
}
// 26 种开局之一，随机转个方向
const turned = (op, t) => opMoves(op).map(i => { const [x, y] = xy(i); return (t[2] * x + t[3] * y + 7) * N + (t[0] * x + t[1] * y + 7); });
const pickOne = a => a[(Math.random() * a.length) | 0];
// 摆一个大致均衡的开局。
//   连珠的几种（RIF、山口、索索夫-8）：26 种开局的理论结论是按连珠规则得出的，挑接近均势的几种。
//   Swap / Swap2（标准五子棋）：没有禁手时这些结论不作数（多数黑棋必胜），抽几种让引擎估一下，挑黑棋胜率最接近五成的
async function balancedOpening() {
  if (RENJU_OPEN.has(S.op.rule)) return turned(pickOne(OPENINGS.filter(o => ['eqw', 'eqb', 'ws', 'bs'].includes(o.ev))), pickOne(T8));
  const tries = [];
  for (let k = 0; k < 6; k++) { const seq = turned(pickOne(OPENINGS), pickOne(T8)); tries.push({ seq, d: Math.abs((await blackP(seq)) - 50) }); }
  tries.sort((a, z) => a.d - z.d);
  return pickOne(tries.slice(0, 2)).seq;
}
// 塔拉古奇：在中心 (2r+1)×(2r+1) 内挑一手（引擎推荐的里取范围内的，没有就取离天元最近的空点）
async function zoneMove(color, r) {
  const ok = i => b[i] === 0 && dist(i) <= r && !(color === 1 && S.rule === 'renju' && isForbidden(i, 0));
  const list = await topFor(S.moves.slice(), color, 12);
  const hit = (list || []).map(x => x.m).find(ok);
  if (hit !== undefined) return hit;
  for (let d = 0; d <= r; d++) for (let i = 0; i < N * N; i++) if (dist(i) === d && ok(i)) return i;
  return -1;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function aiStep(tk) {
  const o = S.op;
  if (!o || tk !== S.token || !aiActs()) return;
  const ms = () => S.moves.slice(), live = () => S.op === o && tk === S.token;
  try {
    switch (o.step) {
      case 'place3': case 'open': {
        const seq = await balancedOpening(); if (!live()) return;
        for (let k = S.moves.length; k < 3; k++) { await wait(380); if (!live()) return; play(seq[k]); }
        o.busy = false; return o.step === 'open' ? afterOpen() : go('choose');
      }
      case 'choose': {                                // 乙：黑棋明显好就拿黑，明显差就拿白，差不多就再摆两颗让甲选
        const p = await blackP(ms()); if (!live()) return;
        o.busy = false;
        const nm = LEVEL_NAME[S.level];
        if (o.rule === 'swap1') { o.black = p >= 50 ? 'B' : 'A'; o.why = `${nm}选择执${p >= 50 ? '黑' : '白'}`; return finish(); }
        if (p >= 58) { o.black = 'B'; o.why = `${nm}选择执黑`; return finish(); }
        if (p <= 42) { o.black = 'A'; o.why = `${nm}选择执白`; return finish(); }
        o.step = 'place2'; saveGame();               // 先记成「再摆两子」，摆到一半刷新也能接着摆
        return aiStep(tk);
      }
      case 'place2': {                                // 假后方（对手）：再摆一白一黑
        for (let k = S.moves.length; k < 5; k++) { const m = await bestMove(ms(), toMoveC()); if (!live()) return; play(m); if (k < 4) await wait(380); }
        o.busy = false; return go('choose2');
      }
      case 'choose2': {                               // 甲：哪边好拿哪边（这时轮到白走）
        const p = await blackP(ms()); if (!live()) return;
        o.busy = false; o.black = p >= 50 ? 'A' : 'B'; o.why = `${LEVEL_NAME[S.level]}选择执${p >= 50 ? '黑' : '白'}`; return finish();
      }
      case 'declareA': {                              // 假先方（山口）：黑越好，打点数给得越多，免得对方交换
        const p = await blackP(ms()); if (!live()) return;
        o.n = Math.max(1, Math.min(10, Math.round((p - 50) / 5) + 2));
        o.busy = false; return go('swap1');
      }
      case 'swap1': {                                 // 假后方：后面还有打点，黑棋要明显好才拿黑（已知打点数时按打点数折算）
        const p = await blackP(ms()); if (!live()) return;
        const take = o.rule === 'ss8' ? p >= 60 : p - 4 * (Math.max(1, o.n) - 1) >= 55;
        o.busy = false; o.black = take ? 'B' : 'A'; return go('fourth');
      }
      case 'fourth': {                                // 执白：下第 4 手
        const m = await bestMove(ms(), 2); if (!live()) return; play(m);
        o.busy = false; return afterFourth();
      }
      case 'tswap': {                                 // 塔拉古奇：刚落下的一方占优就换过去
        const p = await blackP(ms()); if (!live()) return;
        const c = toMoveC(), swap = c === 2 ? p >= 56 : p <= 44;
        o.busy = false; if (swap) o.black = other(o.black); return afterTswap();
      }
      case 'tmove': case 'tfive': {
        const r = o.step === 'tfive' ? 4 : S.moves.length, m = await zoneMove(toMoveC(), r); if (!live()) return;
        play(m); o.busy = false;
        return go('tswap');
      }
      case 'tchoice': o.busy = false; return go('tfive');   // 黑方：在 9×9 内直接下第 5 手（摆 10 个打点对黑方不利）
      case 'declare': {                               // 执白：按形势声明打点数——黑越好，要的打点越多
        const p = await blackP(ms()); if (!live()) return;
        o.n = Math.max(1, Math.min(8, Math.round((p - 50) / 5) + 2));
        o.busy = false; return go('swap2');
      }
      case 'swap2': {                                 // 执黑：打点越多黑越吃亏，估一下还划不划算
        const p = await blackP(ms()); if (!live()) return;
        o.busy = false; if (p - 4 * (o.n - 1) < 45) o.black = other(o.black); return go('offer');
      }
      case 'offer': {                                 // 执黑：摆出最好的几个、互不对称的第 5 手
        const list = await topFor(ms(), 1, o.n + 8); if (!live()) return;
        const keys = new Set(), out = [];
        for (const x of list) { const k = symKey(x.m); if (keys.has(k) || (S.rule === 'renju' && isForbidden(x.m, 0))) continue; keys.add(k); out.push(x.m); if (out.length === o.n) break; }
        for (let r = 1; out.length < o.n && r < 7; r++) for (let i = 0; i < N * N && out.length < o.n; i++) {   // 不够就在附近补
          const [x, y] = xy(i); if (Math.max(Math.abs(x), Math.abs(y)) !== r || b[i]) continue;
          const k = symKey(i); if (keys.has(k) || (S.rule === 'renju' && isForbidden(i, 0))) continue; keys.add(k); out.push(i);
        }
        for (const m of out) { await wait(160); if (!live()) return; o.offers.push(m); render(); }
        o.busy = false; return go('pick');
      }
      case 'pick': {                                  // 执白：挑一个对黑最不利的
        let best = o.offers[0], bp = 101;
        for (const m of o.offers) { const p = await blackP(ms().concat(m)); if (!live()) return; if (p < bp) { bp = p; best = m; } }
        o.busy = false; return pickOffer(best);
      }
    }
  } catch (e) { o.busy = false; updateUI(); throw e; }
}

/* ---- 开局卡（OpeningCard.vue）要显示的 ---- */
const STEP = {
  place3: '摆放前三手', choose: '选择执子', place2: '摆放第 4、5 手', choose2: '选择执子',
  open: '摆出开局', declareA: '声明打点数', swap1: '交换', fourth: '第 4 手', declare: '声明打点数', swap2: '交换', offer: '摆放打点', pick: '选定第 5 手',
  tswap: '交换', tchoice: '第 5 手', tfive: '第 5 手',
};
function tip(o) {
  const c = toMoveC(), k = S.moves.length + 1, r = S.moves.length;
  switch (o.step) {
    case 'place3': return '假先方在棋盘任意位置摆放前三手：黑、白、黑。随后由假后方' + (o.rule === 'swap1' ? '选择执黑或执白。' : '决定执子。');
    case 'choose': return o.rule === 'swap1' ? '假后方选择执黑或执白。随后由白方下第 4 手。' : '假后方从三项中选择一项：执白，并下第 4 手；执黑，由对方下第 4 手；再摆放一白一黑两子，由假先方选择执子。';
    case 'place2': return '假后方再摆放两子：第 4 手白子，第 5 手黑子，位置不限。';
    case 'choose2': return '假先方选择执黑或执白。随后由白方下第 6 手。';
    case 'open': return '假先方摆出开局：第 1 手黑子在天元，第 2 手白子须与天元直接相邻，第 3 手黑子须在以天元为中心的 5×5 范围内。';
    case 'declareA': return '假先方声明第 5 手的打点数。打点数越多，对黑方越不利。';
    case 'swap1': return '假后方可选择交换：执黑，或执白。' + (o.rule === 'yama' ? `本局第 5 手打点数为 ${o.n}。` : o.rule === 'rif' ? '第 5 手由黑方摆出 2 个打点。' : '');
    case 'fourth': return '白方下第 4 手，位置不限。';
    case 'declare': return '白方声明第 5 手的打点数（1–8）。打点数越多，对黑方越不利。';
    case 'swap2': return '黑方可选择交换：继续执黑，或改执白。';
    case 'offer': return `黑方摆出 ${o.n} 个第 5 手打点，打点之间不得互相对称` + (S.rule === 'renju' ? '，也不得位于禁手点' : '') + '。点击已摆出的打点可撤回。';
    case 'pick': return `白方从 ${o.n} 个打点中选定一个作为第 5 手，随后下第 6 手。`;
    case 'tswap': return `第 ${k - 1} 手已下。执${CN(c)}的一方可选择交换：继续执${CN(c)}，或改执${CN(3 - c)}。` + (k - 1 === 5 ? '随后由白方下第 6 手，开局结束。' : '');
    case 'tmove': return `${CN(c)}方下第 ${k} 手，须在以天元为中心的 ${2 * r + 1}×${2 * r + 1} 范围内。`;
    case 'tchoice': return '黑方选择：在以天元为中心的 9×9 范围内下第 5 手；或在棋盘任意位置摆出 10 个互不对称的第 5 手打点，由白方选定其一。';
    case 'tfive': return '黑方下第 5 手，须在以天元为中心的 9×9 范围内。随后对方可选择交换。';
  }
  return '';
}
// 执子什么时候算定下来：之后再没有交换
function colorsFinal(o) {
  if (o.rule === 'ss8') return o.step === 'offer' || o.step === 'pick';
  if (o.rule === 'rif' || o.rule === 'yama') return ['fourth', 'offer', 'pick'].includes(o.step);
  if (o.rule === 'tara') return o.step === 'offer' || o.step === 'pick';
  return false;
}
// 开局规则限定的落子范围（画布上淡淡标出）：半径几路，不限为 -1
export function opZone() {
  const o = S.op; if (!o || !o.mine) return -1;
  if (o.step === 'open') return S.moves.length === 1 ? 1 : 2;
  if (o.step === 'tmove') return S.moves.length;
  if (o.step === 'tfive') return 4;
  return -1;
}
export function openingView() {
  const o = S.op; if (!o) return null;
  const a = actor(), who = partyName(a), mine = !aiActs();
  const btns = [];
  if (mine && !o.busy) {
    if (o.step === 'choose') btns.push(['white', '执白'], ['black', '执黑']), o.rule === 'swap2' && btns.push(['more', '再摆两子']);
    if (o.step === 'choose2' || o.step === 'swap1') btns.push(['black', '执黑'], ['white', '执白']);
    if (o.step === 'swap2') btns.push(['keep', '继续执黑'], ['swap', '交换（改执白）']);
    if (o.step === 'tswap') { const c = toMoveC(); btns.push(['keep', `继续执${CN(c)}`], ['swap', `交换（改执${CN(3 - c)}）`]); }
    if (o.step === 'tchoice') btns.push(['nine', '在 9×9 内下第 5 手'], ['ten', '摆出 10 个打点']);
  }
  const colors = !o.black ? '执子未定' : `${colorsFinal(o) ? '' : '暂定 '}${partyName(o.black)}执黑 · ${partyName(other(o.black))}执白`;
  const title = o.step === 'tmove' ? `第 ${S.moves.length + 1} 手` : STEP[o.step];
  return {
    title: `${RULE_NAME[o.rule]} · ${title}`, who, mine, busy: o.busy || !mine, tip: tip(o), colors, btns,
    declare: mine && !o.busy && (o.step === 'declare' || o.step === 'declareA'), maxN: o.step === 'declareA' ? 10 : 8,
    offers: o.step === 'offer' || o.step === 'pick' ? `${o.offers.length} / ${o.n}` : '',
    parties: PVP() ? '' : `你为${o.ai === 'A' ? '假后方' : '假先方'}`,
  };
}
