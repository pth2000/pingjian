import { gv } from '../stores/game-ui.js';
import { emit } from '../core/hooks.js';
import { PVP, chime, clack, coord, myColor, myTurn, toMove } from '../ui/sound.js';
import { LEVEL_FULL, LEVEL_NAME, REC, S, diffOf, elapsed, fmtTime, oppOf, pushHist, rateOf, savePrefs, saveRec } from '../ui/state.js';
import { cellsBetween, newGame, styleFeat } from './new-game.js';
import { CFG, DIFFS, NN, RULE, assessPosition, b, coachCheck, colorName, isForbidden, place, think, threatInfo, unplace } from '../engine/engine.js';
import { bookNotice, coachOpening } from '../openings/hints.js';
import { updateForb, winLineAt } from '../ui/game-rules.js';
import { render } from '../ui/canvas.js';
import { applyWR, scheduleAssess, updateUI } from '../ui/panel.js';
import { enterReview, moveDeltas } from './review.js';
import { saveGame } from './save.js';
import { persona, pick, renderSay, say, undoMove } from './coach.js';
import { markSlip, ptag } from './marks.js';
import { oppAvatar } from '../story/portraits.js';
import { storyResultHtml } from '../story/story.js';
import { WK, nextPaint, wkCall, wkReady } from '../ui/worker-client.js';
import { coachTerm } from '../openings/coach-terms.js';
import { aiFollowsBook, bookMoveForAI } from '../openings/tree.js';
import { ask, toast } from '../ui/dialogs.js';
import { forbLose } from '../features/hide-forbidden.js';
import { opClick } from './opening-rule.js';
import { changeSetup } from '../ui/input.js';
import { AWAY, CENTER, awayOk } from '../engine/engine.js';
export function play(i, wr) {
  const c = toMove();
  S.sty = S.sty || []; S.sty[S.moves.length] = styleFeat(i, c, S.moves.length ? S.moves[S.moves.length - 1] : -1);
  place(i, c); S.moves.push(i);
  S.hint = -1; S.sel = -1;
  clack(c);
  const ti = threatInfo(i, c);
  S.threat = S.showThreat ? ti : null;
  if (S.threat && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.threatAt = performance.now() + 150;
  S.kinds = S.kinds || []; S.kinds[S.moves.length - 1] = ti ? ti.kind : '';
  S.mt = S.mt || []; S.mt[S.moves.length - 1] = Date.now() - (S.moves.length > 1 && S.lastMoveAt ? S.lastMoveAt : S.t0 || Date.now());
  S.hints = []; hideCoach(); S.marks = null; if (S.moves.length > 3) bookNotice(S.moves.slice(0, -1)); S.lastMoveAt = Date.now(); S.idleSaid = false; S.dropAt = performance.now();
  const w = winLineAt(i, c);
  if (w) { S.over = true; S.winner = c; S.winLine = w; S.winCells = cellsBetween(w[0], w[1]); S.winAnim = performance.now() + 140; finishGame(); }
  else if (S.moves.length === NN) { S.over = true; S.winner = 0; finishGame(); }
  updateForb(); render(); updateUI();
  if (wr === 'defer' && !S.over) {}                       // 由对手的回合顺带算
  else if (Array.isArray(wr) && !S.over) applyWR(S.moves.length, wr[0], wr[1]);
  else scheduleAssess();
  saveGame();
}
// 一盘下完：记战绩、存棋谱、陪练说一句，稍后弹出结算卡。前后各广播一次，剧情和成就接在上面。
// 一盘棋只在第一次分出胜负（或认输）时记一次：之后悔棋、从复盘里接着下，都算「续下」，结果不记战绩、不推剧情和成就
export function finishGame() {
  if (S.settled) { S.tEnd = Date.now(); const tk = S.token; setTimeout(() => { if (tk === S.token && S.over) showResult(outcomeNow(), true); }, S.winLine ? 650 : 200); return; }
  emit('finishing'); settleGame(); emit('finished');
}
const outcomeNow = () => (PVP() ? { outcome: S.winner === 0 ? 'draw' : 'win', pvp: true } : { outcome: S.winner === 0 ? 'draw' : S.winner === S.human ? 'win' : 'lose', prevStreak: 0 });
// 认输：人机对弈是你认输；双人对弈选哪一方认输。记为负（对方胜），和正常下完一样记战绩
export async function resign() {
  if (!canResign()) return;
  let loser;
  if (PVP()) {
    const r = await ask({ title: '认输', text: '选择认输的一方。对局到此结束，另一方获胜。', ok: `${colorName(toMove())}方认输`, alt: `${colorName(3 - toMove())}方认输`, cancel: '取消', danger: true });
    if (!r) return;
    loser = r === 'alt' ? 3 - toMove() : toMove();
  } else {
    const text = S.settled ? '这盘已经记过结果，续下的胜负不计入战绩。' : `对局到此结束，记为负${REC[S.level] && REC[S.level].streak >= 2 ? `，${REC[S.level].streak} 连胜到此为止` : ''}。`;
    if (!(await ask({ title: '认输？', text, ok: '认输', danger: true }))) return;
    loser = S.human;
  }
  if (!canResign()) return;
  S.token++; S.thinking = false; S.pending = null; S.hint = -1; S.hints = []; S.sel = -1; hideCoach();
  Object.assign(S, { over: true, winner: 3 - loser, resigned: loser, winLine: null, winCells: [], winAnim: 0 });
  finishGame();
  updateForb(); render(); updateUI(); saveGame();
}
export const canResign = () => !S.over && !S.op && S.review < 0 && S.moves.length > 0 && !gv.nigiri;
function settleGame() {
  S.tEnd = Date.now(); S.settled = true;
  if (PVP()) {
    const q = REC.pvp, res = { outcome: S.winner === 0 ? 'draw' : 'win', pvp: true };
    if (S.winner === 1) q.b++; else if (S.winner === 2) q.w++; else q.d++;
    if (S.winner) { q.run = q.runColor === S.winner ? q.run + 1 : 1; q.runColor = S.winner; } else { q.run = 0; q.runColor = 0; }
    saveRec();
    if (S.coach) {
      if (!S.winner) say('draw');
      else {                                       // 找出赢家本局最好的一手
        const ds = moveDeltas(); let bk = S.moves.length - 1, bd = -1e9;
        ds.forEach((d, k) => { if (d !== null && (k % 2 === 0 ? 1 : 2) === S.winner && d > bd) { bd = d; bk = k; } });
        say('pvpWin', { side: `${colorName(S.winner)}棋`, other: `${colorName(3 - S.winner)}棋`, n: bk + 1 });
      }
    }
    pushHist(S.winner === 1 ? 'b' : S.winner === 2 ? 'wh' : 'd');
    const tk = S.token;
    setTimeout(() => {
      if (tk !== S.token || !S.over) return;
      if (S.winner) chime([523.25, 659.25, 783.99, 1046.5]); else chime([440, 554.37], 'sine');
      showResult(res);
    }, S.winLine ? 650 : 200);
    return;
  }
  const r = REC[S.level], n = S.moves.length;
  const res = { outcome: S.winner === 0 ? 'draw' : S.winner === S.human ? 'win' : 'lose', prevStreak: r.streak, newFast: false, newBest: false };
  if (res.outcome === 'win') {
    r.w++; r.streak++;
    if (r.streak > r.best) { r.best = r.streak; res.newBest = r.streak >= 2; }
    const humanMoves = Math.ceil(n / 2);
    if (!r.fast || humanMoves < r.fast) { res.newFast = r.fast > 0; r.fast = humanMoves; }
  } else if (res.outcome === 'lose') { r.l++; r.streak = 0; }
  else { r.d++; }
  saveRec();
  pushHist(res.outcome === 'win' ? 'w' : res.outcome === 'lose' ? 'l' : 'd');
  if (S.coach) {
    const ds = moveDeltas();
    let bestK = -1, bestD = 0, worstK = -1, worstD = 0;
    ds.forEach((d, k) => {
      if (d === null) return;
      const mine = (k % 2 === 0 ? 1 : 2) === S.human;
      if (mine && d > bestD) { bestD = d; bestK = k; }
      if (mine && d < worstD) { worstD = d; worstK = k; }
    });
    if (res.outcome === 'win') say(bestD >= 15 ? 'winGood' : 'win', { n: bestK + 1 });
    else if (res.outcome === 'lose') {
      const r0 = REC[S.level];
      if (!PVP() && r0 && r0.l >= 3 && r0.l > r0.w * 2 && diffOf(S.level) !== 'easy' && Math.random() < 0.6) say('streakLose');
      else say(worstD <= -15 ? 'lose' : 'loseFlat', { n: worstK + 1 });
    } else say('draw');
  }
  const tk = S.token;
  setTimeout(() => {
    if (tk !== S.token || !S.over) return;
    if (res.outcome === 'win') chime([523.25, 659.25, 783.99, 1046.5]);
    else if (res.outcome === 'lose') chime([392, 329.63, 261.63], 'sine', 0.18);
    else chime([440, 554.37], 'sine');
    showResult(res);
  }, S.winLine ? 650 : 200);
}
// 结算卡（ResultCard.vue）：把要显示的内容算好交给它。again：续下的结果（不记战绩）
function showResult(res, again = false) {
  const r = REC[S.level], n = S.moves.length, last = coord(S.moves[n - 1]);
  const idx = DIFFS.indexOf(diffOf(S.level)), lvAt = k => oppOf(S.level) + '.' + DIFFS[k];
  const v = { stampCls: 'stamp' + (res.outcome === 'lose' ? ' lose' : res.outcome === 'draw' ? ' draw' : ''), stamp: res.outcome === 'win' ? '胜' : res.outcome === 'lose' ? '负' : '和', title: '', sub: '', btns: [] };
  const badges = [], btn = (label, cls, fn) => v.btns.push({ label, cls, fn });
  if (res.pvp) {
    const q = REC.pvp;
    v.stampCls = 'stamp' + (S.winner ? '' : ' draw'); v.stamp = S.winner ? '胜' : '和';
    v.title = S.winner ? `${colorName(S.winner)}棋胜` : '和棋';
    v.sub = S.winner ? `${colorName(S.winner)}棋在 ${last} 连成五子` : '棋盘下满，双方都没能连成五子。';
    if (S.winner && q.run >= 2) badges.push(`${colorName(S.winner)}棋 ${q.run} 连胜`);
    btn('再来一局', 'primary', () => newGame());
    btn('悔一步', '', () => { hideResult(); undoMove(); });
    btn('更改设置', '', () => changeSetup());
  } else if (res.outcome === 'win') {
    v.title = '你赢了';
    v.sub = `对阵${LEVEL_FULL[S.level]} · ${colorName(S.winner)}棋在 ${last} 连成五子`;
    if (r.streak >= 2) badges.push(`${r.streak} 连胜`);
    if (res.newBest) badges.push('刷新最佳连胜');
    if (res.newFast) badges.push(`最快获胜：${r.fast} 手`);
    btn('再来一局', 'primary', () => newGame());
    if (idx < DIFFS.length - 1) btn(`挑战${LEVEL_FULL[lvAt(idx + 1)]}`, '', () => setLevel(lvAt(idx + 1), true));
    btn('更改设置', '', () => changeSetup());
  } else if (res.outcome === 'lose') {
    v.title = `${LEVEL_NAME[S.level]}获胜`;
    v.sub = res.prevStreak >= 2
      ? `${last} 一手连成五子，${res.prevStreak} 连胜到此为止`
      : `${LEVEL_NAME[S.level]}在 ${last} 连成五子。悔棋回到上一步，看看哪里能挡住。`;
    btn('悔棋再试', 'primary', () => { hideResult(); undoMove(); });
    btn('再来一局', '', () => newGame());
    if (idx > 0 && r.l >= 3 && r.l > r.w * 2) btn(`降到${LEVEL_FULL[lvAt(idx - 1)]}`, '', () => setLevel(lvAt(idx - 1), true));
    btn('更改设置', '', () => changeSetup());
  } else {
    v.title = '和棋';
    v.sub = '棋盘下满，双方都没能连成五子。';
    btn('再来一局', 'primary', () => newGame());
    btn('更改设置', '', () => changeSetup());
  }
  // 隐藏禁手点：说清楚是禁手判负
  if (S.forbLoss >= 0) {
    const at = coord(S.forbLoss), why = S.forbWhy && S.forbWhy !== '禁手' ? S.forbWhy + '禁手' : '禁手';
    if (PVP()) { v.title = '白方胜 · 黑方禁手'; v.sub = `黑方在 ${at} 形成${why}，按连珠规则判负。`; }
    else if (S.human === 1) { v.title = '禁手判负'; v.sub = `你在 ${at} 形成${why}，按连珠规则判负。悔棋可退回上一步。`; }
  }
  // 认输
  if (S.resigned) {
    const L = S.resigned;
    if (PVP()) { v.title = `${colorName(S.winner)}棋胜 · ${colorName(L)}方认输`; v.sub = `${colorName(L)}方在第 ${n} 手后认输。`; }
    else { v.title = `${LEVEL_NAME[S.level]}获胜 · 你认输了`; v.sub = `第 ${n} 手后认输${res.prevStreak >= 2 ? `，${res.prevStreak} 连胜到此为止` : ''}。`; }
    v.btns = v.btns.filter(x => x.label !== '悔棋再试' && x.label !== '悔一步');
    if (!v.btns.some(x => x.cls === 'primary') && v.btns.length) v.btns[0].cls = 'primary';
  }
  // 续下：结果照常显示，但不记战绩、不算连胜
  if (again) {
    badges.length = 0;
    v.sub = `${v.sub.replace(/[。.]?$/, '。')}这盘已经记过结果，续下的胜负不计入战绩。`;
  }
  v.badge = badges.join(' · ');
  const sr = res.pvp ? null : S.storyRes, q = sr ? sr.line : '';
  v.q = q ? `<span class="rq-face">${oppAvatar(oppOf(S.level))}</span><span><b>${LEVEL_NAME[S.level]}</b>「${q}」</span>` : '';
  v.story = storyResultHtml(sr);
  if (again) { v.q = ''; v.story = ''; }
  v.n = n; v.time = fmtTime(elapsed());
  v.rate = res.pvp ? `${REC.pvp.b} : ${REC.pvp.w}` : rateOf(r); v.rateLbl = res.pvp ? '黑 : 白' : '胜率';
  gv.result = v; gv.resultOn = true; gv.resultSeq++;
}
// 结算卡上的「复盘本局」：从最糟的那一手开始看
export function reviewAfterGame() {
  hideResult();
  const ds = moveDeltas(); let worst = 0, wi = 0;
  ds.forEach((d, k) => { if (d !== null && d < worst) { worst = d; wi = k; } });
  enterReview(worst <= -12 ? wi : 0);
}
export function hideResult() { gv.resultOn = false; }
function setLevel(lv, restart) {
  S.level = lv; savePrefs();
  if (restart) { S.keepOpp = true; newGame(); } else updateUI();
}
// 陪练什么时候开口说「松了」：胜率掉多少才算。按人设，再按难度调——入门时对手自己也常松，大师难度只说要紧的
const DIFF_WARN = { easy: 1.5, normal: 1, hard: 1.1, master: 1.4 };
function warnAt() { const w = persona().warnDrop === undefined ? 12 : persona().warnDrop; return PVP() ? w : w * (DIFF_WARN[diffOf(S.level)] || 1); }
// 要命的一手：下完就输（对方有杀），或者放过了自己的必胜
const isFatal = res => !!res && ((res.pCand <= 12 && res.pBest >= 18 && res.drop >= 10) || (res.pBest >= 90 && res.pCand < 90));
export const KIND_CN = { five: '连五', live4: '活四', four3: '四三', rush4: '冲四', double3: '双活三', live3: '活三' };
export async function humanPlay(i) {
  if (gv.nigiri) return;                            // 猜先还没猜完
  if (S.op) return opClick(i);                      // 开局规则还没走完：摆子、摆打点、挑打点
  if (AWAY && !S.over && S.review < 0 && myTurn() && b[i] === 0) {   // Pro / Long Pro
    const nm = AWAY === 3 ? 'Pro' : 'Long Pro';
    if (S.moves.length === 0 && i !== CENTER) return toast(`按 ${nm} 规则，第 1 手须下在天元`);
    if (!awayOk(i)) return toast(`按 ${nm} 规则，第 3 手须与天元相距至少 ${AWAY} 路`);
  }
  if (S.over || S.thinking || S.pending || S.review >= 0 || !myTurn() || b[i] !== 0) return;
  if (RULE === 'renju' && toMove() === 1 && isForbidden(i, 0)) {
    if (S.hideForb) return forbLose(i);           // 隐藏禁手点：下到禁手直接判负
    toast('这是黑棋的禁手点（三三、四四或长连），不能落子'); return;
  }
  // 失误提醒分三档（S.guard）：0 关闭，落子后再点评；1 仅致命失误（下完就输、错过连续冲四）；2 所有明显失误
  const guard = S.coach && !PVP() && !S.pendingOk ? (S.guard | 0) : 0;
  if (S.coach && !PVP() && !S.pendingOk && guard < 2) S.slipCheck = { i, c: myColor(), n: S.moves.length + 1, before: S.moves.slice() };
  const check = guard > 0;
  S.pendingOk = false;
  if (!check) {
    const prevTi = pvpPrevThreat();
    commitPlay(i);
    if (S.coach && PVP()) pvpComment(i, 3 - toMove(), prevTi);
    if (praiseNext) { praiseNext = false; setTimeout(() => { if (S.coach && !S.over) say('praise'); }, 260); }
    return;
  }
  // 陪练模式：先让棋子落下，陪练在对手“思考”的时间里看这手棋；不妥再提醒，可以撤回改下
  const tk = S.token, c = myColor(), prevThreat = S.threat;
  hideCoach();
  play(i, (!PVP() && S.showWR) ? 'defer' : undefined);
  S.prevThreat = prevThreat;
  if (S.over) return;
  S.thinking = true; S.busyLabel = PVP() ? '陪练在看这手…' : `${LEVEL_NAME[S.level]}思考中…`; updateUI(); render();
  await settleDrop();
  if (tk !== S.token) return;
  let r = await wkCall({ type: 'coach', color: c, cand: i, moves: S.moves.slice(0, -1) }, 12000);
  if (tk !== S.token) return;
  if (!r) { unplace(i); try { r = { res: coachCheck(c, i) }; } finally { place(i, c); } }
  S.thinking = false;
  const res = r.res;
  if (res && res.best !== i && b[res.best] === 0 && (isFatal(res) || (guard === 2 && res.drop >= warnAt()))) {
    // 放过了自己的必胜：先把那串连续冲四算出来，好告诉你从哪起手
    let vcf = null;
    if (res.pBest >= 90 && res.pCand > 12) {
      S.thinking = true; updateUI();
      const v = await wkCall({ type: 'vcf', color: c, moves: S.moves.slice(0, -1), ms: 1500 }, 4000);
      S.thinking = false;
      if (tk !== S.token) return;
      if (v && v.done && v.seq.length && v.seq[0] !== i) vcf = v.seq;
    }
    S.slipCheck = null; showCoach(i, res, c, vcf); updateUI(); return;
  }
  if (S.slipCheck) S.slipCheck.res = res;          // 没有暂停提醒的：对手应完再说，不用重算
  if (res && res.drop <= 2 && res.candKind && ['live3', 'four3', 'rush4', 'double3', 'live4'].includes(res.candKind)) setTimeout(() => { if (S.coach && !S.over) say('praise'); }, 260);
  if (!PVP()) aiTurn(); else updateUI();
}
// 等刚落的子画完；没有后台线程时，还要等落子动画走完再开始算，免得棋子停在半空
async function settleDrop() {
  await nextPaint();
  if (!WK || !wkReady) {
    const left = 220 - (performance.now() - (S.dropAt || 0));
    if (left > 0) await new Promise(res => setTimeout(res, left));
    render(); await nextPaint();
  }
}
let praiseNext = false;
// 双人对弈的陪练：不作失误提醒，每手落下后在一旁描述局面
function pvpPrevThreat() {
  if (!S.moves.length) return null;
  const k = S.moves.length - 1;
  return threatInfo(S.moves[k], k % 2 === 0 ? 1 : 2);
}
// 失误提醒关闭（或这手不到提醒的程度）：对手落子后，回头点评你刚才那手；没有后台线程就不查，免得卡
async function reviewSlip() {
  const sc = S.slipCheck; S.slipCheck = null;
  if (!sc || !S.coach || !WK || !wkReady || S.moves[sc.n - 1] !== sc.i) return false;
  const tk = S.token, n = S.moves.length;
  const r = sc.res ? { res: sc.res } : await wkCall({ type: 'coach', color: sc.c, cand: sc.i, moves: sc.before }, 6000);
  if (tk !== S.token || S.moves.length !== n || !S.coach) return false;
  const res = r && r.res;
  if (!res) return false;
  // 放过了自己的必胜：找出那串连续冲四，告诉你从哪起手、几手能赢
  if (res.pBest >= 90 && res.pCand < 90 && res.best !== sc.i) {
    const v = await wkCall({ type: 'vcf', color: sc.c, moves: sc.before, ms: 1500 }, 4000);
    if (tk !== S.token || S.moves.length !== n || !S.coach) return false;
    if (v && v.done && v.seq.length && v.seq[0] !== sc.i) {
      S.silentRun = 0;
      say(v.seq.length > 1 ? 'missedWin' : 'missedWin1', { best: ptag(v.seq[0]), len: Math.ceil(v.seq.length / 2) });
      return true;
    }
  }
  if (res.drop >= warnAt() && res.best !== sc.i && res.best >= 0) {
    S.silentRun = 0;
    say('afterSlip', {
      cand: ptag(sc.i), best: ptag(res.best),
      opp: res.oppMove >= 0 ? ptag(res.oppMove) : '', oppKind: res.oppKind ? KIND_CN[res.oppKind] : '',
      pBest: Math.round(res.pBest), pCand: Math.round(res.pCand),
    });
    S.ignored = { ply: sc.n - 1, mine: sc.i, advised: res.best };
    return true;
  }
  if (res.drop <= 2 && res.candKind && ['live3', 'four3', 'rush4', 'double3', 'live4'].includes(res.candKind)) { say('praise'); return true; }
  return false;
}
// 双人对弈：陪练只讲这手做了什么（挡住、做出棋形、好棋），不说哪里更好、有没有杀——那等于替一边支招。
// 松着和放过的胜机，下完「跟陪练复盘」时两边一起讲
async function pvpComment(i, c, prevTi) {
  if (!S.coach || !PVP() || S.over) return;
  if (coachOpening() || coachTerm()) return;
  const tk = S.token, n = S.moves.length;
  const side = `${colorName(c)}棋`, other = `${colorName(3 - c)}棋`;
  const blocked = prevTi && prevTi.keys && prevTi.keys.includes(i) ? (KIND_CN[prevTi.kind] || '威胁') : null;
  const kd = S.kinds && S.kinds[n - 1];
  const made = kd ? (KIND_CN[kd] || '棋形') : null;
  // 夸一句好棋要先确认这手确实不差；没有后台线程就不查，免得卡住棋盘
  const r = !blocked && !made && WK && wkReady ? await wkCall({ type: 'coach', color: c, cand: i, moves: S.moves.slice(0, -1) }, 6000) : null;
  if (tk !== S.token || S.moves.length !== n || !S.coach || !PVP()) return;   // 已经下了下一手，这句就不说了
  const res = r && r.res;
  const v = { side, other, m: ptag(i), a: blocked, b: made };
  if (blocked && made) { S.silentRun = 0; say('pvpBlockMake', v); }
  else if (blocked) { S.silentRun = 0; say('pvpBlock', v); }
  else if (made && !S.over) { S.silentRun = 0; say('pvpAttack', v); }
  else if (res && res.drop <= 2 && res.candKind && ['live3', 'four3', 'rush4', 'double3', 'live4'].includes(res.candKind)) { S.silentRun = 0; say('pvpPraise', v); }
  else {
    const q = persona().quietChance;
    S.silentRun = S.silentRun || 0;
    if (S.silentRun < 3 && Math.random() < (q === undefined ? 0.6 : q) + 0.2) { S.silentRun++; return; }
    S.silentRun = 0; say('pvpQuiet', v);
  }
}
export function commitPlay(i) {
  hideCoach();
  const prev = S.threat;
  play(i, (!PVP() && S.showWR) ? 'defer' : undefined);
  S.prevThreat = prev;
  if (!S.over && !PVP()) aiTurn();
}
function showCoach(i, res, c, vcf) {
  if (vcf) {                                        // 有杀没走
    res = Object.assign({}, res, { best: vcf[0] });
    S.pending = { i, res, c, title: `${persona().name}：这里有杀`, why: pick(vcf.length > 1 ? 'missedWin' : 'missedWin1', { best: ptag(vcf[0]), len: Math.ceil(vcf.length / 2) }), take: `撤回，改下 ${coord(vcf[0])}` };
    markSlip(i, vcf[0], -1, c);
    return;
  }
  const opp = 3 - c;
  const heavy = isFatal(res) || res.drop >= warnAt() * 2;
  const vars = {
    cand: ptag(i),
    best: ptag(res.best),
    opp: res.oppMove >= 0 ? ptag(res.oppMove) : '',
    oppKind: res.oppKind ? KIND_CN[res.oppKind] : '',
    pBest: Math.round(res.pBest), pCand: Math.round(res.pCand),
  };
  const pl = persona().lines || {};
  const key = heavy && pl.warnHeavy && pl.warnHeavy.length ? 'warnHeavy' : (pl.warn && pl.warn.length ? 'warn' : null);
  let why;
  if (key) why = pick(key, vars);
  else {
    why = heavy ? `慢着——${vars.cand} 这手要吃亏的。` : `先别急，${vars.cand} 我看着有点松。`;
    if (res.oppMove >= 0) {
      why += res.oppKind
        ? `你一落子，他 ${vars.opp} 一摆就是<b>${vars.oppKind}</b>，你就得跟着他走了。`
        : `他接着会走 ${vars.opp}，先手就到他那边了。`;
    }
    why += `我要是你，走 ${vars.best}：那样你的胜率大概 ${vars.pBest}%，这手只有 ${vars.pCand}%。`;
  }
  S.pending = { i, res, c, title: `${persona().name}：${heavy ? '这手要吃亏' : '等一下'}`, why, take: `撤回，改下 ${coord(res.best)}` };   // CoachGuard.vue
  markSlip(i, res.best, res.oppMove, c);
}
export function hideCoach() { S.pending = null; S.hints = []; S.marks = null; }
export function aiTurn() {
  S.thinking = true; S.busyLabel = `${LEVEL_NAME[S.level]}思考中…`; updateUI(); render();
  const tk = S.token;
  const t0 = performance.now(), minShow = diffOf(S.level) === 'easy' ? 420 : 160;   // 太快落子反而像没想
  setTimeout(async () => {
    if (tk !== S.token) return;
    await settleDrop();
    if (tk !== S.token) return;
    const color = 3 - S.human, nH = S.moves.length;
    const want0 = S.showWR && nH > 0 && S.wr[nH] === undefined, want1 = S.showWR;
    const cfg = Object.assign({}, CFG[S.level], { last: nH ? S.moves[nH - 1] : -1 });
    const budget = (cfg.time || 400) + (cfg.vcfTime || 0) + (cfg.vctTime || 0) + (cfg.defend || 0) + 11000;
    const r = await wkCall({ type: 'turn', level: S.level, color, cfg: { last: cfg.last }, wr0: want0, wr: want1 }, budget);
    if (tk !== S.token) return;
    let m, wr0 = r && r.wr0, wr1 = r && r.wr1;
    if (r && typeof r.move === 'number' && r.move >= 0 && b[r.move] === 0) m = r.move;
    else {                                        // 没有后台线程：同样的活在主线程里干完，期间一直显示“思考中”
      if (want0) wr0 = assessPosition();
      m = think(color, cfg);
      if (want1 && m >= 0) { place(m, color); try { wr1 = assessPosition(); } finally { unplace(m); } }
    }
    if (aiFollowsBook()) { const bm = bookMoveForAI(S.moves); if (bm >= 0 && bm !== m) { m = bm; wr1 = null; } }
    if (want0 && wr0) applyWR(nH, wr0[0], wr0[1]);
    const wait = minShow - (performance.now() - t0);
    if (wait > 0) await new Promise(res => setTimeout(res, wait));
    if (tk !== S.token) return;
    S.thinking = false;
    const prev = S.prevThreat;
    play(m, want1 && wr1 ? wr1 : undefined);
    if (S.coach) { const said = await reviewSlip(); if (!said && !coachOpening() && !coachTerm()) sayAboutMove(m, color, prev); }
  }, 0);
}
function sayAboutMove(m, c, prevThreat) {
  const blocked = prevThreat && prevThreat.by !== c && prevThreat.keys && prevThreat.keys.includes(m)
    ? (KIND_CN[prevThreat.kind] || '威胁') : null;
  const ti = threatInfo(m, c), made = ti ? (KIND_CN[ti.kind] || '棋形') : null;
  const key = blocked && made ? 'block_and_make' : blocked ? 'block_only' : made ? 'attack_only' : 'quiet';
  // 没什么可说的时候就别硬找话说——安静比套话更像人
  // 平淡局面多半不吭声，但不会连着沉默太久
  if (key === 'quiet') {
    const q = persona().quietChance;
    S.silentRun = (S.silentRun || 0);
    if (S.silentRun < 2 && Math.random() < (q === undefined ? 0.6 : q)) { S.silentRun++; return; }
  }
  S.silentRun = 0;
  S.say = pick(key, { a: blocked, b: made, m: ptag(m) });
  renderSay(true);
  // 你没听劝的那手，两手之后给个说法
  if (S.ignored && S.moves.length >= S.ignored.ply + 2) {
    const now = S.wr[S.moves.length], then = S.wr[S.ignored.ply];
    if (now !== undefined && then !== undefined) {
      const mine = S.human === 1 ? now - then : then - now;
      setTimeout(() => { if (S.coach && !S.over) say(mine <= -10 ? 'vindicated' : mine >= 8 ? 'wrong' : 'quiet'); }, 900);
    }
    S.ignored = null;
  }
}
