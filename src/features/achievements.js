/* ================= 成就 =================
   记在本机（gomoku-ach）。大部分成就从战绩、棋谱、杀法记录里就能判断，打开页面时会补发（不弹提示，只在主页标“新”）；
   少数要看这一盘怎么下的（没用提示、四三、禁手陷阱……），只在下完那一刻判断。 */
import { HIST, LEVELS, REC, S, diffOf, oppOf } from '../ui/state.js';
import { DIFFS, OPPONENTS, b, isForbidden, withBoard } from '../engine/engine.js';
import { PZREC, pzLevel } from '../puzzles/puzzles.js';
import { PUZZLES } from '../data/puzzles.js';
import { VIEW } from '../ui/views.js';
import { PVP, chime } from '../ui/sound.js';
import { ui } from '../stores/ui.js';
import { on } from '../core/hooks.js';
import { nextTick, reactive, watch } from 'vue';
import { BK } from '../openings/book-page.js';
import { load, save } from '../core/storage.js';

export const ACH = reactive({ got: {}, fresh: [], ops: [], drill: [] });   // ops 看过的开局；drill 练通的开局（定式练习按谱走完、没有出谱）
export const achSave = () => save('ach', ACH);
export const ACH_CAT = ['胜负', '对手', '规则', '妙手', '定式', '杀法', '其他'];
const aiHist = () => HIST.filter(x => x.lv && x.lv !== 'pvp');
const wonAt = (opp, ds) => ds.some(d => REC[opp + '.' + d] && REC[opp + '.' + d].w > 0);
const anyWonAt = ds => OPPONENTS.some(o => wonAt(o.id, ds));
// 按规则算的胜局：棋规（free / std / renju）、开局规则（swap2、ss8……，不设为 free）
const aiWins = () => aiHist().filter(x => x.r === 'w');
const winRules = () => new Set(aiWins().map(x => x.rule || 'renju'));
const winOpens = () => new Set(aiWins().map(x => x.or).filter(o => o && o !== 'free'));
const pzDone = p => PZREC[p.id] && PZREC[p.id].g !== 'seen';
const G = (ctx, f) => !!(ctx && ctx.g && f(ctx.g));          // 只在下完一盘时判断
export const ACHS = [
  { id: 'first', cat: '胜负', g: '初', t: 1, name: '初出茅庐', desc: '第一次战胜电脑。', test: () => anyWonAt(DIFFS) || aiHist().some(x => x.r === 'w') },
  { id: 'white', cat: '胜负', g: '白', t: 2, name: '后发制人', desc: '执白战胜电脑。', test: c => aiHist().some(x => x.h === 2 && x.r === 'w') || G(c, g => g.win && g.human === 2) },
  { id: 'hard', cat: '胜负', g: '登', t: 2, name: '登堂入室', desc: '在困难难度下获胜。', test: () => anyWonAt(['hard', 'master']) },
  { id: 'master', cat: '胜负', g: '宗', t: 3, name: '一代宗师', desc: '在大师难度下获胜。', test: () => anyWonAt(['master']) },
  { id: 'streak3', cat: '胜负', g: '破', t: 2, name: '势如破竹', desc: '对同一位对手、同一难度三连胜。', test: () => LEVELS.some(k => REC[k] && REC[k].best >= 3) },
  { id: 'streak5', cat: '胜负', g: '靡', t: 3, name: '所向披靡', desc: '对同一位对手、同一难度五连胜。', test: () => LEVELS.some(k => REC[k] && REC[k].best >= 5) },
  { id: 'draw', cat: '胜负', g: '和', t: 1, hidden: true, name: '平分秋色', desc: '下成一盘和棋。', test: () => HIST.some(x => x.r === 'd') },
  { id: 'meet6', cat: '对手', g: '缘', t: 1, name: '六面之缘', desc: '和六位对手都下过棋。', test: () => { const s = new Set(aiHist().map(x => oppOf(x.lv))); return OPPONENTS.every(o => s.has(o.id)); } },
  { id: 'all6', cat: '对手', g: '服', t: 2, name: '尽数折服', desc: '普通或以上难度，六位对手各赢一次。', test: () => OPPONENTS.every(o => wonAt(o.id, ['normal', 'hard', 'master'])) },
  { id: 'all6h', cat: '对手', g: '英', t: 3, name: '群英谱', desc: '困难或以上难度，六位对手各赢一次。', test: () => OPPONENTS.every(o => wonAt(o.id, ['hard', 'master'])) },
  { id: 'rules3', cat: '规则', g: '通', t: 2, name: '三规皆通', desc: '在无禁手、标准五子棋、连珠三种棋规下各战胜电脑一次。', test: () => ['free', 'std', 'renju'].every(r => winRules().has(r)) },
  { id: 'gwc', cat: '规则', g: '赛', t: 2, name: '世锦赛之路', desc: '按五子棋世锦赛现行规则（标准五子棋 · Swap2）战胜电脑。', test: () => winOpens().has('swap2') },
  { id: 'rwc', cat: '规则', g: '珠', t: 2, name: '连珠正统', desc: '按连珠世锦赛现行规则（连珠 · 索索夫-8）战胜电脑。', test: () => winOpens().has('ss8') },
  { id: 'opens4', cat: '规则', g: '局', t: 3, name: '开局百家', desc: '在四种不同的开局规则下各战胜电脑一次。', test: () => winOpens().size >= 4 },
  { id: 'blind', cat: '规则', g: '盲', t: 2, name: '心中有禁', desc: '连珠规则下开启「隐藏禁手点」，执黑战胜电脑。', test: c => G(c, g => g.win && g.human === 1 && g.rule === 'renju' && g.hideForb) },
  { id: 'over', cat: '规则', g: '过', t: 1, hidden: true, name: '过犹不及', desc: '标准五子棋中，棋盘上连出六子以上的长连，却不算赢。', test: c => G(c, g => g.rule === 'std' && g.over6) },
  { id: 'fast', cat: '妙手', g: '速', t: 2, name: '速战速决', desc: '普通或以上难度，自己下不到 12 手就赢。', test: c => aiHist().some(x => x.r === 'w' && diffOf(x.lv) !== 'easy' && Math.ceil(x.n / 2) <= 11) },
  { id: 'long', cat: '妙手', g: '鏖', t: 1, name: '百手鏖战', desc: '一盘棋下到 100 手以上。', test: () => HIST.some(x => x.n >= 100) },
  { id: 'comeback', cat: '妙手', g: '翻', t: 3, hidden: true, name: '绝地翻盘', desc: '普通或以上难度，胜率一度跌到 20% 以下，最后赢了电脑。', test: () => aiHist().some(x => x.r === 'w' && diffOf(x.lv) !== 'easy' && Array.isArray(x.wr) && x.wr.some((v, k) => k > 2 && v !== null && (x.h === 1 ? v : 100 - v) < 20)) },
  { id: 'clean', cat: '妙手', g: '独', t: 3, name: '独立自主', desc: '困难或以上难度，不用提示、不悔棋赢一局。', test: c => G(c, g => g.win && ['hard', 'master'].includes(g.diff) && !g.aid.hint && !g.aid.undo) },
  { id: 'four3', cat: '妙手', g: '绝', t: 2, name: '四三绝杀', desc: '下出四三，并赢下这盘。', test: c => G(c, g => g.win && g.kinds.some((k, j) => k === 'four3' && (j % 2 === 0 ? 1 : 2) === g.human)) },
  { id: 'trap', cat: '妙手', g: '瓮', t: 3, hidden: true, name: '请君入瓮', desc: '执白，逼得黑棋只能在禁手点上防守，就此取胜。', test: c => G(c, g => g.win && g.human === 2 && g.trap) },
  { id: 'dsview', cat: '定式', g: '览', t: 1, name: '翻谱人', desc: '在定式页看过 10 种开局。', test: () => ACH.ops.length >= 10 },
  { id: 'dsall', cat: '定式', g: '博', t: 2, name: '博览群谱', desc: '26 种开局都看过。', test: () => ACH.ops.length >= 26 },
  { id: 'dsok', cat: '定式', g: '循', t: 2, name: '照谱行棋', desc: '一次定式练习里，连着 8 手都下在谱上。', test: c => !!(c && c.ev === 'dsok') },
  { id: 'dsend', cat: '定式', g: '尽', t: 2, name: '谱尽之处', desc: '定式练习一手不错，一直走到谱的尽头。', test: c => !!(c && c.ev === 'dsend') },
  { id: 'pz1', cat: '杀法', g: '试', t: 1, name: '初试锋芒', desc: '解开第一道杀法题。', test: () => PUZZLES.some(pzDone) },
  { id: 'pzbasic', cat: '杀法', g: '门', t: 2, name: '入门毕业', desc: '入门档的杀法题全部解开。', test: () => PUZZLES.filter(p => pzLevel(p) === 0).every(pzDone) },
  { id: 'pzperf', cat: '杀法', g: '气', t: 2, name: '一气呵成', desc: '一次解开 10 道杀法题（不用提示、没走错）。', test: () => PUZZLES.filter(p => PZREC[p.id] && PZREC[p.id].g === 'perfect').length >= 10 },
  { id: 'pzall', cat: '杀法', g: '全', t: 3, name: '杀法大全', desc: '31 道杀法题全部解开。', test: () => PUZZLES.every(pzDone) },
  { id: 'pvp', cat: '其他', g: '友', t: 1, name: '以棋会友', desc: '下完一盘双人对弈。', test: () => HIST.some(x => x.lv === 'pvp') },
  { id: 'coach', cat: '其他', g: '教', t: 1, name: '虚心求教', desc: '开着陪练下完一盘。', test: c => G(c, g => g.coach) },
  { id: 'review', cat: '其他', g: '复', t: 1, name: '温故知新', desc: '复盘一盘棋。', test: c => !!(c && c.ev === 'review') },
];
export const ACH_TIER = ['', '铜', '银', '金'];
// 检查一遍，新达成的记下来；silent 时不弹提示（打开页面时的补发）
export function achCheck(ctx, silent) {
  const got = [];
  for (const a of ACHS) {
    if (ACH.got[a.id]) continue;
    let ok = false; try { ok = a.test(ctx); } catch (e) { ok = false; }
    if (ok) { ACH.got[a.id] = Date.now(); if (!ACH.fresh.includes(a.id)) ACH.fresh.push(a.id); got.push(a); }
  }
  if (got.length) { achSave(); if (!silent) got.forEach(achToast); if (VIEW === 'ach') renderAch(); }
  return got;
}
/* ---- 达成时的提示：从顶部滑下来一张小卡，几条就排队依次出 ---- */
const achQ = []; let achBusy = false;
function achToast(a) { achQ.push(a); if (!achBusy) achNext(); }
function achNext() {
  const a = achQ.shift(); if (!a) { achBusy = false; return; }
  achBusy = true;
  ui.ach.show = false; ui.ach.a = a;               // AchToast.vue：先放上去，下一帧再滑下来
  nextTick(() => { const el = document.getElementById('achToast'); if (el) void el.offsetWidth; ui.ach.show = true; });
  try { chime([659.25, 880, 1174.66], 'sine', 0.12); } catch (e) {}
  setTimeout(() => { ui.ach.show = false; setTimeout(achNext, 420); }, 3400);
}
/* ---- 成就页 ---- */
// 进成就页（或在成就页上又达成了）：记下哪些是「新」的给页面标出来，然后清掉标记（下次不再标「新」）
export function renderAch() { ui.achFresh = new Set(ACH.fresh); if (ACH.fresh.length) { ACH.fresh = []; achSave(); } }

// 棋盘上有没有六子以上的长连（棋子不会拿掉，看终局就够了）
function hasOverline(moves) {
  const g = new Map(moves.map((m, k) => [m, k % 2 === 0 ? 1 : 2]));
  for (const [m, c] of g) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const x = m % 15, y = (m / 15) | 0;
    if (g.get((y - dy) * 15 + x - dx) === c && x - dx >= 0 && x - dx < 15 && y - dy >= 0 && y - dy < 15) continue;   // 只从一段的起点数
    let n = 0; for (let k = 0; k < 15; k++) { const xx = x + dx * k, yy = y + dy * k; if (xx < 0 || yy < 0 || xx >= 15 || yy >= 15 || g.get(yy * 15 + xx) !== c) break; n++; }
    if (n >= 6) return true;
  }
  return false;
}
/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  const a = load('ach'); if (a && typeof a === 'object') Object.assign(ACH, a);
  /* ---- 接到各处：下完一盘、复盘、提示和悔棋的次数、定式页、杀法题 ---- */
  S.aid = { hint: 0, undo: 0 };
  on('newGame', () => { S.aid = { hint: 0, undo: 0 }; });
  on('hint', () => { if (!PVP()) S.aid.hint++; });
  on('undone', () => { S.aid.undo++; });
  on('review', () => setTimeout(() => achCheck({ ev: 'review' }), 0));
  on('finished', () => {
    try {
      const pvp = PVP(), n = S.moves.length, win = !pvp && S.winner && S.winner === S.human;
      let trap = false;
      if (win && S.human === 2 && S.rule === 'renju' && n >= 3) {     // 白棋最后成五的那个点，上一手时对黑棋是禁手（所以黑棋没法挡）
        const w = S.moves[n - 1];
        trap = withBoard(S.moves.slice(0, n - 2), () => b[w] === 0 && isForbidden(w, 0));
      }
      const g = { pvp, win, human: S.human, diff: pvp ? '' : diffOf(S.level), aid: S.aid || { hint: 0, undo: 0 }, kinds: (S.kinds || []).slice(), coach: !!S.coach, trap,
        rule: S.rule, hideForb: !!S.hideForb, over6: S.rule === 'std' && hasOverline(S.moves) };
      setTimeout(() => achCheck({ ev: 'game', g }), S.winLine ? 1500 : 900);
    } catch (e) {}
  });
  // 定式页每打开一种开局记一次（「遍览」之类的成就）
  watch(() => ui.view === 'dingshi' && BK.op && BK.op.id, id => {
    if (id && !ACH.ops.includes(id)) { ACH.ops.push(id); achSave(); achCheck({ ev: 'ds' }); }
  });
  achCheck({ ev: 'load' }, true);
}
