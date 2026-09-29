// 老陈的话。每类若干种说法，随机挑且不连着重复
// 兜底人设（coaches.js 没加载成功时用这个）
import { emit } from '../core/hooks.js';
import { $, S } from '../ui/state.js';
import { nextTick } from 'vue';
import { gv } from '../stores/game-ui.js';
import { PVP, myColor, myTurn, narrow, toMove } from '../ui/sound.js';
import { updateUI } from '../ui/panel.js';
import { hasOwnMove } from './new-game.js';
import { KIND_CN, aiTurn, hideCoach, hideResult } from './play.js';
import { b, threatInfo, topMoves, unplace } from '../engine/engine.js';
import { updateForb } from '../ui/game-rules.js';
import { render } from '../ui/canvas.js';
import { saveGame } from './save.js';
import { wkCall } from '../ui/worker-client.js';
import { toast } from '../ui/dialogs.js';
import { ptag } from './marks.js';
import { humanPlay } from './play.js';
const COACH_FALLBACK = {
  id: 'laochen', name: '老陈', face: '陈', title: '棋馆的老茶客', desc: '棋馆的老茶客，只看不下。一把蒲扇一壶茶，话多，眼毒。',
  quietChance: 0.6, warnDrop: 12,
  lines: {
    greet: ['茶续上了。你下，我在边上看着。'],
    block_and_make: ['他这手够狠：拆你的{a}，顺手做{b}。'],
    block_only: ['{a}被他堵死了，换条道走。'],
    attack_only: ['他要做{b}了。', '留神，他的{b}起来了。'],
    quiet: ['嗯。', '还早。'],
    praise: ['好。', '对，就这儿。'],
    keep: ['行，你拿主意。'], take: ['这就对了。'],
    vindicated: ['看见没，刚才说的就是这个。'], wrong: ['是我看保守了。'],
    swingUp: ['势头过来了，别松劲。'], swingDown: ['有点被动了。'],
    idle: ['不急，慢慢看。'], hint: ['看这几个：{list}。'],
    missedWin: ['刚才有杀的：{best} 起手，连冲 {len} 手。'], missedWin1: ['刚才有杀的：{best} 一放就是活四。'],
    winGood: ['赢了。第 {n} 手那下是关键。'], win: ['赢了。'],
    lose: ['输在第 {n} 手，回头看看那儿。'], loseFlat: ['他下得好，输得不冤。'],
    draw: ['下满了，和棋。'], streakLose: ['连着输了几盘，要不降一档？'],
    pvpGreet: ['两位请，我在边上看。'], pvpAttack: ['{side}在 {m} 做出{b}。'],
    pvpBlock: ['{side}挡住了{a}。'], pvpBlockMake: ['{side}挡住{a}，顺手做出{b}。'],
    pvpPraise: ['{side}这手漂亮。'],
    pvpQuiet: ['嗯。', '还早。'], afterSlip: ['刚才那手 {cand} 有点松，{best} 更好。想重来可以悔棋。'], pvpSwing: ['形势倒向{side}了。'], pvpWin: ['{side}赢了，第 {n} 手是关键。'],
    lessonIntro: ['挑 {count} 处看看。'], lessonSlip: ['第 {n} 手，{who}走 {cand}，{best} 更好（{pBest}% 对 {pCand}%）。'],
    lessonHeavy: ['第 {n} 手是要命的一手，{cand} 之后他就有杀了，得走 {best}。'], lessonOpp: ['他接着 {opp}，就是{oppKind}。'],
    lessonMissedWin: ['第 {n} 手有杀：{best} 起手，连冲 {len} 手。'], lessonMissedWin1: ['第 {n} 手有杀：{best} 一放就是活四。'], lessonGood: ['第 {n} 手 {cand} 是好棋。'],
    lessonEnd: ['就这几处。'], lessonNone: ['这盘下得干净，没什么好挑的。'],
  },
};
// 陪练人设：coaches.js（普通脚本，比模块先加载）里的配置，没加载成功就用老陈
export const COACHES = (Array.isArray(window.COACHES) && window.COACHES.length) ? window.COACHES : [COACH_FALLBACK];
export function persona() { return COACHES.find(c => c.id === S.coachId) || COACHES[0]; }
// 每类台词对应的表情
const MOOD = {
  greet: 'happy', block_and_make: 'surprise', block_only: 'idle', attack_only: 'surprise', quiet: 'idle',
  praise: 'happy', keep: 'worry', take: 'happy', vindicated: 'worry', wrong: 'surprise',
  swingUp: 'happy', swingDown: 'worry', idle: 'idle', hint: 'idle',
  winGood: 'happy', win: 'happy', lose: 'worry', loseFlat: 'idle', draw: 'surprise', streakLose: 'worry',
  warn: 'worry', warnHeavy: 'worry', afterSlip: 'worry',
  pvpGreet: 'happy', pvpAttack: 'surprise', pvpBlock: 'idle', pvpBlockMake: 'surprise',
  pvpPraise: 'happy', pvpQuiet: 'idle', pvpSwing: 'surprise', pvpWin: 'happy',
  scout: 'idle', missedWin: 'surprise', missedWin1: 'surprise', lessonMissedWin1: 'surprise',
  lessonIntro: 'idle', lessonSlip: 'worry', lessonHeavy: 'worry', lessonOpp: 'worry', lessonMissedWin: 'surprise', lessonGood: 'happy', lessonEnd: 'happy', lessonNone: 'happy',
};
let moodTimer = 0;
function setMood(m) {
  S.mood = m || 'idle';
  renderFaces(true);
  clearTimeout(moodTimer);
  if (S.mood !== 'idle') moodTimer = setTimeout(() => { S.mood = 'idle'; renderFaces(false); }, 6500);
}
// 心情符号：只提供一张图片时，用它叠在图上表达表情
const MOOD_MARK = {
  happy: '<svg class="mark" viewBox="0 0 20 20"><path d="M10 1 Q11 9 19 10 Q11 11 10 19 Q9 11 1 10 Q9 9 10 1z" fill="#FFE27A" stroke="#E0A52E" stroke-width=".8"/></svg>',
  worry: '<svg class="mark" viewBox="0 0 20 20"><path d="M10 2 q7 9 0 14 q-7 -5 0 -14z" fill="#9AD4F5" stroke="#4F9ACB" stroke-width="1"/></svg>',
  surprise: '<svg class="mark" viewBox="0 0 20 20"><text x="6" y="17" font-size="17" font-weight="900" fill="#D9453A" font-family="sans-serif">!</text></svg>',
};
// 头像来源优先级：coaches.js 里的 images（真图）> avatars.js 里的矢量画像 > 印章字
export function faceHTML(pc, mood) {
  const imgs = pc.images;
  if (imgs && (imgs[mood] || imgs.idle)) {
    const src = imgs[mood] || imgs.idle;
    const mark = !imgs[mood] && MOOD_MARK[mood] ? MOOD_MARK[mood] : '';   // 没有对应表情图时补个符号
    return `<img src="${src}" alt="" draggable="false">${mark}`;
  }
  const svg = window.drawAvatar ? window.drawAvatar(pc.avatar || pc.id, mood) : null;
  return svg || null;
}
// 陪练头像（CoachFace.vue）：换表情时重画，pop 时弹一下
function renderFaces(pop) { if (pop) gv.facePop++; }
export const recent = [];
// 台词表里按键取：'scout.chong' 这种带点的，取 scout 下面 chong 那一组
const linesAt = (lines, key) => key.split('.').reduce((o, k) => (o && o[k]) || null, lines);
export function pick(key, vars) {
  const pc = persona(), own = linesAt(pc.lines, key);
  const arr = Array.isArray(own) && own.length ? own : linesAt(COACH_FALLBACK.lines, key);
  if (!arr) return '';
  // 有空缺变量的台词（比如没有具体棋形可说）尽量不选，免得出现“就是棋形”这种半句话
  const full = arr.filter(x => !(x.match(/\{(\w+)\}/g) || []).some(m => { const v = vars && vars[m.slice(1, -1)]; return v === undefined || v === '' || v === null; }));
  const base = full.length ? full : arr;
  const fresh = base.filter(x => !recent.includes(x));
  const pool = fresh.length ? fresh : base;
  const t = pool[(Math.random() * pool.length) | 0];
  const mk = MOOD[key.split('.')[0]]; if (mk) setMood(mk);
  recent.push(t);
  if (recent.length > 8) recent.shift();
  return t.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ''));
}
// 开局陪练说的第一句：人机对弈时多半按对手的棋风提醒一句，否则打个招呼
export function greetLine() {
  if (PVP()) return say('pvpGreet');
  const id = String(S.level).split('.')[0], sc = linesAt(persona().lines, 'scout.' + id);
  say(Array.isArray(sc) && sc.length && Math.random() < 0.7 ? 'scout.' + id : 'greet');
}
export function say(key, vars) {
  if (!S.coach) return;
  if (S.say) { S.sayLog = [S.say, ...(S.sayLog || [])].slice(0, 6); }
  S.say = pick(key, vars);
  renderSay(true);
}
// 陪练的话（CoachSay.vue）：animate 时气泡淡入
export function renderSay(animate) {
  if (animate) gv.sayAnim++;
  sayClamp();
}
// 手机上气泡只显示三行：说得长时在末尾给个「展开」，点一下看全文，再点收起
function sayClamp() {
  gv.sayOpen = false; gv.sayMore = false; gv.sayMinH = '';
  if (!narrow()) return;
  nextTick(() => requestAnimationFrame(() => { const el = $('coachSay'), t = $('coachText'); if (el && t && !el.hidden) gv.sayMore = t.scrollHeight > t.clientHeight + 2; }));
}
// 失误提醒暂停时的两个选择：仍下此处 / 撤回改下（CoachGuard.vue 的按钮、回车 / Esc）
export function coachKeep() {
  if (!S.pending) return;
  const { i, res } = S.pending;
  S.ignored = { ply: S.moves.length - 1, mine: i, advised: res.best };
  hideCoach(); say('keep');
  if (!PVP() && !S.over) aiTurn(); else updateUI();
}
export function coachTake() {
  if (!S.pending) return;
  const { i, res } = S.pending, m = res.best;
  hideCoach();
  // 撤回刚才那手，改下建议点
  if (S.moves[S.moves.length - 1] === i) {
    S.moves.pop(); unplace(i);
    S.wr.length = Math.min(S.wr.length, S.moves.length + 1); S.wrNote.length = S.wr.length;
    S.threat = S.prevThreat;
  }
  S.pendingOk = true; S.ignored = null; say('take'); humanPlay(m);
}
export function undoMove() {
  emit('undo');
  if (S.thinking || S.op || !hasOwnMove()) return;
  const pn = S.presetN || 0;
  if (S.over && S.settled) toast('这盘已经记过结果，续下的胜负不计入战绩');
  S.token++; hideCoach();
  if (PVP()) unplace(S.moves.pop());
  else do { unplace(S.moves.pop()); } while (S.moves.length > pn && toMove() !== S.human);
  emit('undone');
  if (S.tEnd) { S.t0 += Date.now() - S.tEnd; S.tEnd = 0; }
  if (S.bookLeft && S.bookLeft.k >= S.moves.length) S.bookLeft = null;
  Object.assign(S, { over: false, winner: 0, resigned: 0, winLine: null, winCells: [], winAnim: 0, hint: -1, sel: -1 });
  S.threat = (S.showThreat && S.moves.length) ? threatInfo(S.moves[S.moves.length - 1], S.moves.length % 2 === 0 ? 2 : 1) : null;
  hideResult();
  S.wr.length = Math.min(S.wr.length, S.moves.length + 1); S.wrNote.length = S.wr.length;
  if (S.kinds) S.kinds.length = Math.min(S.kinds.length, S.moves.length); if (S.sty) S.sty.length = Math.min(S.sty.length, S.moves.length); if (S.mt) S.mt.length = Math.min(S.mt.length, S.moves.length);
  S.sugg = {};
  updateForb(); render(); updateUI(); saveGame();
  if (!PVP() && toMove() !== S.human) aiTurn();
}
// 提示：引擎眼中最好的三手，标上 1 / 2 / 3；陪练开着就让陪练说
export async function giveHint() {
  if (S.over || S.thinking || S.op || S.review >= 0 || !myTurn()) return;
  emit('hint');
  const tk = S.token, c = myColor();
  S.thinking = true; S.busyLabel = '正在挑选候选点…'; updateUI();
  const r = (await wkCall({ type: 'top', color: c, k: 3 }, 8000)) || { list: topMoves(c, 3) };
  if (tk !== S.token) return;
  S.thinking = false;
  const list = (r.list || []).filter(x => b[x.m] === 0);
  S.hints = list.map(x => x.m);
  S.hint = list.length ? list[0].m : -1;
  S.sel = -1;
  if (S.coach) {
    S.say = list.length
      ? pick('hint', { list: list.map((x, k) => `${k + 1}. ${ptag(x.m)}` + (x.kind ? `（${KIND_CN[x.kind]}）` : '')).join('　') })
      : '这里没什么特别的好点，随便找个地方发展吧。';
    renderSay(true);
  } else if (!list.length) toast('这里没什么特别的好点，随便找个地方发展吧');
  render(); updateUI();
}

/* ---- 启动：窗口大小变了，手机上的气泡重新判断要不要「展开」 ---- */
export function __init() {
  addEventListener('resize', () => sayClamp());
}
