/* ---- 跟陪练复盘：挑出胜率变化最大的两三手，一处一处讲 ----
   每一处：回到那一手之前的局面，棋盘上标出实战那手（？）、更好的点（绿圈）、对方会怎么应（红虚线）；
   「看后面怎么走」把实战之后对方的手顺（或者放过的那串连续冲四）按顺序摆出来。
   S.lesson = { list: [{ k, d, c, st: 'wait' | 'ok', kind, text, best, cand, opp, seq, seqC }], at, show }
   只在已下完或复盘时用；开新局、从某手继续、手动翻到别处都会结束讲解。 */
import { S, LEVEL_NAME } from '../ui/state.js';
import { PVP } from '../ui/sound.js';
import { coachCheck, colorName, pvLine, vcfLine, withBoard } from '../engine/engine.js';
import { wkCall } from '../ui/worker-client.js';
import { moveDeltas, enterReview, exitReview } from './review.js';
import { hideResult } from './play.js';
import { pick, persona, say } from './coach.js';
import { ptag, setMarks } from './marks.js';
import { render } from '../ui/canvas.js';
import { updateUI } from '../ui/panel.js';
import { RULE } from '../engine/engine.js';

const KIND_CN = { five: '连五', live4: '活四', four3: '四三', rush4: '冲四', double3: '双活三', live3: '活三' };
const who = c => (PVP() ? `${colorName(c)}棋` : c === S.human ? '你' : LEVEL_NAME[S.level]);

// 挑哪几处：人机对弈只看你下的，双人两边都看；掉得最多的三手，按先后排。一处都没有就挑一手好棋
function pickMoments() {
  const ds = moveDeltas(), mine = k => PVP() || (k % 2 === 0 ? 1 : 2) === S.human;
  const bad = ds.map((d, k) => ({ d, k })).filter(x => x.d !== null && x.d <= -12 && mine(x.k)).sort((a, z) => a.d - z.d).slice(0, 3).sort((a, z) => a.k - z.k);
  if (bad.length) return bad;
  const good = ds.map((d, k) => ({ d, k })).filter(x => x.d !== null && x.d >= 10 && mine(x.k)).sort((a, z) => z.d - a.d).slice(0, 1);
  return good.map(x => Object.assign(x, { good: true }));
}
export function canLesson() { return S.moves.length >= 8 && (S.over || S.review >= 0); }
export async function startLesson() {
  hideResult();
  const list = pickMoments().map(x => ({ k: x.k, d: x.d, good: !!x.good, c: x.k % 2 === 0 ? 1 : 2, st: 'wait', text: '' }));
  S.lesson = { list, at: 0, show: false, intro: list.length && !list[0].good ? pick('lessonIntro', { count: list.length }) : '' };
  const L = S.lesson;                              // 响应式的那一份：后面改它，讲解卡才跟着变
  if (!list.length) { L.none = pick('lessonNone'); enterReview(S.moves.length, true); updateUI(); return; }
  await goMoment(0);
  for (let i = 1; i < L.list.length; i++) if (S.lesson === L) await prepare(L.list[i]);   // 后面几处提前算好
}
export async function goMoment(i) {
  const L = S.lesson; if (!L || i < 0 || i >= L.list.length) return;
  L.at = i; L.show = false;
  const m = L.list[i];
  enterReview(m.k, true);
  await prepare(m);
  if (S.lesson === L && L.at === i) showMarks();
}
export function toggleLine() { const L = S.lesson; if (!L) return; L.show = !L.show; showMarks(); }
export function endLesson(quiet) {
  if (!S.lesson) return;
  const done = !quiet && S.lesson.list.length && S.lesson.at === S.lesson.list.length - 1;
  S.lesson = null; S.marks = null;
  exitReview();
  if (done) say('lessonEnd');
  render(); updateUI();
}
// 棋盘上的标注：实战那手、更好的点、对方的应手；或者展开的手顺
function showMarks() {
  const L = S.lesson, m = L && L.list[L.at];
  if (!m || m.st !== 'ok') return;
  if (L.show && m.seq && m.seq.length) setMarks({ seq: { moves: m.seq, c: m.seqC }, bad: m.good ? -1 : m.cand, c: m.c });
  else setMarks({ bad: m.good ? -1 : m.cand, best: m.good ? -1 : m.best, opp: m.good ? -1 : m.opp, c: m.c });
  updateUI();
}
// 算一处的内容：这手和更好的一手差多少、对方会怎么罚、有没有放过的连续冲四
// 同一处只算一次：正在算的时候又翻到这里，就等着同一个结果
function prepare(m) {
  if (!m.p) m.p = compute(m);
  return m.p;
}
async function compute(m) {
  m.st = 'busy';
  const moves = S.moves.slice(0, m.k), cand = S.moves[m.k], c = m.c;
  m.cand = cand;
  const call = async (msg, ms, local) => (await wkCall(Object.assign({ moves }, msg), ms)) || withBoard(msg.moves || moves, local, RULE);
  const cr = await call({ type: 'coach', color: c, cand }, 12000, () => ({ res: coachCheck(c, cand) }));
  const res = cr && cr.res;
  const v = { who: who(c), n: m.k + 1, cand: ptag(cand) };
  if (m.good || !res) {
    m.kind = 'good'; m.text = pick('lessonGood', v);
    m.seq = []; m.st = 'ok'; return;
  }
  Object.assign(v, { best: ptag(res.best), pBest: Math.round(res.pBest), pCand: Math.round(res.pCand) });
  m.best = res.best; m.opp = res.oppMove;
  // 放过了自己的连续冲四
  if (res.pBest >= 90 && res.pCand < 90) {
    const vr = await call({ type: 'vcf', color: c, ms: 1500 }, 4000, () => vcfLine(c, 1500));
    if (vr && vr.done && vr.seq && vr.seq.length && vr.seq[0] !== cand) {
      m.kind = 'missed'; m.best = vr.seq[0]; m.opp = -1; m.seq = vr.seq; m.seqC = c;
      m.text = pick(vr.seq.length > 1 ? 'lessonMissedWin' : 'lessonMissedWin1', Object.assign(v, { best: ptag(vr.seq[0]), len: Math.ceil(vr.seq.length / 2) }));
      m.st = 'ok'; return;
    }
  }
  m.kind = res.pCand <= 12 ? 'heavy' : 'slip';
  m.text = pick(m.kind === 'heavy' ? 'lessonHeavy' : 'lessonSlip', v);
  if (res.oppMove >= 0 && res.oppKind) m.text += pick('lessonOpp', { opp: ptag(res.oppMove), oppKind: KIND_CN[res.oppKind] || '棋形' });
  // 实战这手之后，对方接下来会怎么走：连同这手一起摆出来
  const after = S.moves.slice(0, m.k + 1);
  const pr = await call({ type: 'pv', color: 3 - c, n: 6, moves: after }, 5000, () => ({ line: pvLine(3 - c, 6) }));
  m.seq = [cand].concat((pr && pr.line) || []); m.seqC = c;
  m.st = 'ok';
}
// 讲解卡（LessonCard.vue）要显示的内容
export function lessonView() {
  const L = S.lesson; if (!L) return null;
  const pc = persona();
  if (L.none) return { pc, none: true, text: L.none };
  const m = L.list[L.at], n = L.list.length;
  return {
    pc, pos: `${L.at + 1} / ${n}`, head: `第 ${m.k + 1} 手 · ${who(m.c)} ${ptag(m.k < S.moves.length ? S.moves[m.k] : -1)}`,
    busy: m.st !== 'ok', text: (L.at === 0 && L.intro ? L.intro + ' ' : '') + (m.text || ''),
    mood: m.kind === 'good' ? 'happy' : m.kind === 'missed' ? 'surprise' : 'worry',
    canLine: m.st === 'ok' && m.seq && m.seq.length > 1, show: L.show,
    lineLabel: m.kind === 'missed' ? '摆一遍连续冲四' : '看后面怎么走',
    prev: L.at > 0, next: L.at < n - 1,
  };
}
