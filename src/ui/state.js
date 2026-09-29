/* ================= 棋局状态、战绩、棋谱 =================
   S、REC、HIST、STATS 都是响应式的：改了以后界面自己会更新。 */
import { reactive } from 'vue';
import { load, save } from '../core/storage.js';
import { CFG, DIFFS, OPPONENTS } from '../engine/engine.js';
import { PVP } from './sound.js';
import { fitRuleset } from '../game/rulesets.js';

export const $ = id => document.getElementById(id);
export const S = reactive({
  rule: 'renju', human: 1, level: 'chong.normal', moves: [], over: false, winner: 0, winLine: null,
  thinking: false, busyLabel: '', hint: -1, sel: -1, hover: -1, showNum: false, forb: [], token: 0,
});
export const DIFF_NAME = { easy: '入门', normal: '普通', hard: '困难', master: '大师' };
export const DIFF_NOTE = {
  easy: '随性落子，偶尔会漏看你的冲四。',
  normal: '会攻会守，能看四步棋。',
  hard: '算得深，会用连续冲四和四三来做杀，稍不留神就被抓住。',
  master: '每手想两三秒，攻守都很严密，会主动布局做杀。',
};
export const OPP = Object.fromEntries(OPPONENTS.map(o => [o.id, o]));
export const OPP_COL = { atu: "#9A8F6A", chong: "#C4553F", laogui: "#4F7A5A", xieyue: "#4F6EA8", yehu: "#B0762C", wuming: "#3A3432" };
export const LEVELS = [];
export const LEVEL_NAME = {}, LEVEL_FULL = {};
for (const o of OPPONENTS) for (const d of DIFFS) { const k = o.id + '.' + d; LEVELS.push(k); LEVEL_NAME[k] = o.name; LEVEL_FULL[k] = `${o.name}·${DIFF_NAME[d]}`; }
export const oppOf = lv => lv.split('.')[0], diffOf = lv => lv.split('.')[1];
// 兼容旧存档：纯难度 → 守中（均衡）同难度；上一版的单一对手 → 该对手原来的档位
const V24_BASE = { atu: 'easy', chong: 'normal', laogui: 'normal', xieyue: 'hard', yehu: 'hard', wuming: 'master' };
export function normLevel(lv) {
  if (typeof lv !== 'string') return null;
  if (CFG[lv] && lv.includes('.')) return lv;
  if (DIFFS.includes(lv)) return 'wuming.' + lv;
  if (V24_BASE[lv]) return lv + '.' + V24_BASE[lv];
  return null;
}
const blankRec = () => ({ w: 0, l: 0, d: 0, streak: 0, best: 0, fast: 0 });
export const REC = reactive({});
export const HIST = reactive([]);
export const STATS = reactive({ from: 0 });    // 重置战绩的时间：之前的对局不算进生涯战绩
export function pushHist(r) {
  HIST.push({ t: Date.now(), lv: PVP() ? 'pvp' : S.level, h: PVP() ? 0 : S.human, r, n: S.moves.length, ms: elapsed(), rs: S.resigned || undefined, rule: S.rule, or: S.openRule !== 'free' ? S.openRule : undefined,
    m: S.moves.slice(), wr: S.wr.map(x => (x === undefined ? null : Math.round(x))) });
  if (HIST.length > 300) HIST.splice(0, HIST.length - 300);
  save('hist', HIST);
}
export const saveRec = () => save('rec', REC);
// 载入别人的棋谱、历史棋局时会临时换棋规（S.prefRS 记着原来的设置）：存设置时存原来的
export function savePrefs() { const pr = S.prefRS || { rule: S.rule, open: S.openRule }; save('prefs', { level: S.level, human: S.side || S.human, rule: pr.rule, showNum: S.showNum, sound: S.sound, mode: S.mode, showWR: S.showWR, showThreat: S.showThreat, coach: S.coach, coachId: S.coachId, randOpp: !!S.randOpp, guard: S.guard | 0, nigiri: S.nigiri !== false, openRule: pr.open, opFirst: S.opFirst, hideForb: !!S.hideForb }); }
export const rateOf = r => { const t = r.w + r.l + r.d; return t ? Math.round(r.w / t * 100) + '%' : '–'; };
export const fmtTime = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const elapsed = () => (S.tEnd || Date.now()) - (S.t0 || Date.now());
// 重置战绩：各对手各难度、双人对弈都清零
export function resetRec() {
  for (const k of Object.keys(REC)) delete REC[k];
  LEVELS.forEach(k => { REC[k] = blankRec(); }); REC.pvp = { b: 0, w: 0, d: 0, run: 0, runColor: 0 };
  saveRec(); STATS.from = Date.now(); save('reset', STATS.from);
}

/* ---- 启动：读回战绩、棋谱、偏好 ---- */
export function __init() {
  LEVELS.forEach(k => REC[k] = blankRec());
  const r = load('rec');
  if (r && typeof r === 'object') Object.keys(r).forEach(k0 => {
    const k = normLevel(k0), v = r[k0];
    if (!k || (k !== k0 && r[k])) return;
    if (Array.isArray(v)) REC[k] = Object.assign(blankRec(), { w: v[0] | 0, l: v[1] | 0, d: v[2] | 0 });
    else if (v && typeof v === 'object') REC[k] = Object.assign(blankRec(), v);
  });
  STATS.from = +load('reset', 0) || 0;
  const h = load('hist', []); if (Array.isArray(h)) HIST.push(...h.slice(-300));
  S.sound = true; S.mode = 'ai'; S.showWR = true; S.showThreat = true; S.threat = null; S.review = -1; S.sugg = {}; S.coach = false; S.guard = 1; S.nigiri = true; S.openRule = 'free'; S.opFirst = 'me'; S.op = null; S.coachId = (Array.isArray(window.COACHES) && window.COACHES[0] && window.COACHES[0].id) || 'laochen'; S.say = ''; S.pending = null; S.pendingOk = false; S.prevThreat = null; S.hints = []; S.wr = [50]; S.wrNote = [''];
  REC.pvp = { b: 0, w: 0, d: 0, run: 0, runColor: 0 };
  if (r && r.pvp) Object.assign(REC.pvp, r.pvp);
  S.hideForb = false; S.forbLoss = -1; S.forbWhy = '';
  try {
    const p = load('prefs');
    if (p) { const q = p.ai || (p.mode === 'adv' && p.free) || p;   // 兼容试玩过闯关 / 故事模式版本留下的存档
      if (normLevel(q.level)) S.level = normLevel(q.level); if (q.human === 1 || q.human === 2) S.human = q.human; if (['free', 'renju', 'std'].includes(q.rule)) S.rule = q.rule; if (q.randOpp) S.randOpp = true; S.showNum = !!p.showNum; if (p.sound === false) S.sound = false; if (p.mode === 'pvp') S.mode = 'pvp'; if (p.showWR === false) S.showWR = false; if (p.showThreat === false) S.showThreat = false; if (p.coach) S.coach = true; S.guard = [0, 1, 2].includes(p.guard) ? p.guard : p.coachGuard ? 2 : 1; S.nigiri = p.nigiri !== false; if (['free', 'swap1', 'swap2', 'pro', 'lpro', 'rif', 'yama', 'ss8', 'tara'].includes(p.openRule)) S.openRule = p.openRule; if (p.opFirst === 'opp') S.opFirst = 'opp'; if (p.randOpp) S.randOpp = true; if (p.coachId && Array.isArray(window.COACHES) && window.COACHES.some(c => c.id === p.coachId)) S.coachId = p.coachId; S.hideForb = !!p.hideForb; }
  } catch (e) {}
  fitRuleset('open');                               // 棋规和开局规则成对（旧版本的设置里可能不成对）
  S.side = S.human;                                 // 执子设置（用开局规则的局会改 S.human，设置本身不变）
}
