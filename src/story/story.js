/* ================= 交情与剧情（明线下棋，暗线在对局前后的几句话里） =================
   交情只看和这个人下过几盘，输赢、难度、下法都不影响，也不会倒退。
   下法只影响对方当场说的那一句（下法反应）。
   各人的故事、最后一步在 bonds.js。 */
import { PROFILE } from '../core/profile.js';
import { FACT_AT, STAGES, STORY } from './story-data.js';
import { bookState, esc } from '../openings/tree.js';
import { N, OPPONENTS } from '../engine/engine.js';
import { styleRead } from '../game/new-game.js';
import { $, OPP, S, oppOf } from '../ui/state.js';
import { openingOf } from '../openings/openings.js';
import { PVP } from '../ui/sound.js';
import { oppKnown } from './portraits.js';
import { playerFace } from './player-face.js';
import { ui } from '../stores/ui.js';
import { on } from '../core/hooks.js';
import { reactive } from 'vue';
import { nextTick } from 'vue';
import { load, save } from '../core/storage.js';
import { bondName, bondsOnGame, isLove, migrateOld, showEvent } from './bonds.js';
import { openPerson } from '../ui/views.js';

const blankST = () => ({ cnt: {}, stage: {}, got: [], total: 0, last: { opp: null, run: 0 }, day: '', on: true, freshW: 0, heard: {}, meet: {}, lastT: {}, best: {},
  bond: {}, bondT: {}, bondN: {}, arc: {}, arcN: {} });
export const ST = reactive(blankST());
// 清空剧情数据（剧情开关保留）
export function resetST() { const on = ST.on; for (const k of Object.keys(ST)) delete ST[k]; Object.assign(ST, blankST(), { on }); }
// 札记页现在看的是谁（null 是总览）
export const NT = reactive({ sel: null });
export const stSave = () => save('story', ST);
export const playerName = () => (PROFILE.cur && PROFILE.cur.name) || '你';
export const playerG = () => (PROFILE.cur && PROFILE.cur.g) === 'f' ? 'f' : 'm';
// 文字里的 {name} {call} {ta} {男版|女版}，按当前角色换掉（id 是说这句话的对手）
export function stFill(s, id) {
  const g = playerG(), d = id && STORY[id];
  return esc(String(s || ''))
    .replace(/\{call\}/g, d && d.call ? esc(d.call[g]) : '')
    .replace(/\{ta\}/g, g === 'f' ? '她' : '他')
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, a, b) => g === 'f' ? b : a)
    .replace(/\{name\}/g, esc(playerName()));
}
const stPick = a => (a && a.length ? a[Math.floor(Math.random() * a.length)] : '');
export const stageOf = id => ST.stage[id] || 0;
export const stageName = id => (stageOf(id) >= 5 && ST.bond[id] ? bondName(id) : STAGES[stageOf(id)].k);
// 说哪一组话：恋人用最后一组；到了最后一段但只是朋友，用知己那组（守中这样只做朋友的，用 friendSet）
function lineSet(id) {
  const s = stageOf(id);
  if (s >= 5) return isLove(id) ? 3 : (STORY[id].friendSet ?? 2);
  return s >= 4 ? 2 : s >= 2 ? 1 : 0;
}
export function storyLine(id, kind) {
  const d = STORY[id]; if (!d || !d.lines[kind]) return '';
  const set = ST.on ? lineSet(id) : 0, arr = d.lines[kind][set] || [];
  if (!arr.length) return '';
  const i = Math.floor(Math.random() * arr.length);
  stHeard(id, `${kind}.${set}.${i}`);
  return stFill(arr[i], id);
}
// 札记「听过的话」：记下每一句说过的话（键：kind.组.序号，下法反应是 r.键）
export function stHeard(id, k) { const h = ST.heard[id] || (ST.heard[id] = []); if (!h.includes(k)) { h.push(k); stSave(); } }
export const LINE_KIND = { greet: '见面', win: 'TA 赢了', lose: 'TA 输了', draw: '和棋', r: '看你下棋' };
// 一个人所有可能说的话（同样的字只算一句）
export function allLines(id) {
  const d = STORY[id], seen = new Map();
  for (const kind of ['greet', 'win', 'lose', 'draw']) (d.lines[kind] || []).forEach((set, si) => set.forEach((t, i) => { if (!seen.has(t)) seen.set(t, { t, kind, keys: [] }); seen.get(t).keys.push(`${kind}.${si}.${i}`); }));
  Object.entries(d.react || {}).forEach(([k, [, t]]) => { if (!seen.has(t)) seen.set(t, { t, kind: 'r', keys: [] }); seen.get(t).keys.push('r.' + k); });
  return [...seen.values()];
}
export function heardLines(id) { const h = new Set(ST.heard[id] || []); return allLines(id).filter(x => x.keys.some(k => h.has(k))); }
// 这盘是不是斜着连成五的
function diagWin() { const c = S.winCells || []; return c.length >= 2 && c[0] % N !== c[1] % N && ((c[0] / N) | 0) !== ((c[1] / N) | 0); }
/* ---- 下法反应：这盘的下法让对方多说一句（不计分） ---- */
function storyReact(id, g) {
  const d = STORY[id]; if (!d || !d.react || S.resigned) return '';   // 认输的盘不评下法
  const hs = (() => { try { return styleRead(g.human); } catch (e) { return null; } })();
  const mine = g.moves.filter((m, k) => (k % 2 === 0 ? 1 : 2) === g.human);
  const dist = m => Math.max(Math.abs(m % N - 7), Math.abs(((m / N) | 0) - 7));
  const early = mine.slice(g.human === 1 ? 1 : 0, 4);
  const mt = (S.mt || []).filter((t, k) => (k % 2 === 0 ? 1 : 2) === g.human && t > 0);
  const hr = new Date().getHours();
  const C = {
    white: () => g.human === 2,
    long60: () => g.n >= 60, long80: () => g.n >= 80, fast30: () => g.n <= 30,
    corner: () => early.length >= 2 && early.reduce((a, m) => a + dist(m), 0) / early.length >= 3,
    slow: () => mt.length >= 4 && mt.reduce((a, t) => a + t, 0) / mt.length > 15000,
    defend: () => hs && hs.atk < 0.4, diag: () => hs && hs.diag > 0.56, near: () => hs && hs.near > 0.42, far: () => hs && hs.near < 0.22,
    night: () => hr >= 22 || hr < 5,
    diagWin: () => diagWin(),
    offbook: () => { try { const bs = g.n >= 6 && openingOf(g.moves) && bookState(g.moves.slice(0, 6)); return !!bs && !bs.inBook; } catch (e) { return false; } },
    streak: () => ST.last.run >= 3, first: () => g.first,
  };
  const hit = Object.entries(d.react).filter(([k, [when]]) => (when === 'any' || (when === 'win' && g.out === 'win')) && C[k] && C[k]());
  ST.lr = ST.lr || {};
  const fresh = hit.filter(([k]) => k !== ST.lr[id]);                     // 同一句反应不连着说两次
  if (!fresh.length || Math.random() >= 0.45) { ST.lr[id] = ''; return ''; }
  const [k, [, txt]] = stPick(fresh); ST.lr[id] = k; stHeard(id, 'r.' + k);
  return stFill(txt, id);
}
/* ---- 下完一盘：记交情、升段，再交给 bonds.js（故事、最后一步） ---- */
export function storyOnGame() {
  if (PVP()) return null;
  const id = oppOf(S.level); if (!STORY[id]) return null;
  const out = S.winner === 0 ? 'draw' : S.winner === S.human ? 'win' : 'lose';
  const today = new Date().toDateString(), first = ST.day !== today; ST.day = today;
  ST.last = ST.last.opp === id ? { opp: id, run: ST.last.run + 1 } : { opp: id, run: 1 };
  const before = stageOf(id);
  ST.cnt[id] = (ST.cnt[id] || 0) + 1; ST.total++;
  { const now = Date.now(), n = S.moves.length, b = ST.best[id] || (ST.best[id] = {});
    if (!ST.meet[id]) ST.meet[id] = now; ST.lastT[id] = now;
    if (n > (b.long || 0)) b.long = n;
    if (out === 'win' && (!b.fast || n < b.fast)) b.fast = n; }
  let st = Math.min(before, 4);
  while (st < 4 && ST.cnt[id] >= STAGES[st + 1].n) st++;
  const ups = [];
  for (let s = Math.min(before, 4) + 1; s <= st; s++) { ST.got.push({ id, k: s - 1, t: Date.now() }); ups.push(s); }
  if (before < 5) ST.stage[id] = st;
  if (st === 4 && ST.arcN[id] == null) ST.arcN[id] = ST.cnt[id];     // 到了知己：故事从这里开始数
  if (ups.length) ST.freshW += ups.length;
  const g = { human: S.human, n: S.moves.length, moves: S.moves.slice(), out, first };
  const kind = out === 'win' ? 'lose' : out === 'lose' ? 'win' : 'draw';          // 对方的口吻：你赢了就是 TA 输了
  const ev = bondsOnGame(id);
  const line = (ST.on && storyReact(id, g)) || storyLine(id, kind);
  stSave();
  return { id, line, ups: ST.on ? ups : [], ev };
}
// 结算卡下面的小字：升段
export function storyResultHtml(sr) {
  if (!sr) return '';
  let h = '';
  if (sr.ups.length) { const s = sr.ups[sr.ups.length - 1]; h += `<button type="button" class="rs-line" data-nt="${sr.id}"><i>交情</i>${STAGES[s].k === '相识' ? `认识了${esc(OPP[sr.id].name)}` : `和${esc(OPP[sr.id].name)}${STAGES[s].k === '知己' ? '成了知己' : STAGES[s].k + '了'}`} · 札记里多了一页 ›</button>`; }
  return h;
}
/* ---- 浮层卡片：故事、最后一步、创建角色、调试面板（components/story/StoryLayer.vue） ---- */
export function stOverlay(kind, data = null, cls = kind) {
  Object.assign(ui.layer, { kind, data, cls, seq: ui.layer.seq + 1 });
  if (kind !== 'dbg') nextTick(() => setTimeout(() => { const el = $('stLayer'), f = el && el.querySelector('[autofocus],button,input'); if (f) f.focus({ preventScroll: true }); if (el) { const c = el.querySelector(".st-card"); if (c) c.scrollTop = 0; } }, 40));
}
export function stClose() { ui.layer.kind = ''; ui.layer.data = null; }
/* ---- 创建角色 ---- */
export function genderPick(cur, nm = 'stG') {
  return `<div class="st-gender" role="radiogroup" aria-label="模样">${[['m', '青衫'], ['f', '红袖']].map(([g, t]) => `<label class="st-g"><input type="radio" name="${nm}" value="${g}" ${cur === g ? 'checked' : ''}><span class="st-gf">${playerFace(g)}</span><b>${t}</b></label>`).join('')}</div>`;
}
export function showCreate(canCancel) { stOverlay('create', { canCancel: !!canCancel }, 'create' + (canCancel ? '' : ' lock')); }
/* ---- 刊头的角色入口（components/AppMasthead.vue） ---- */
/* ---- 档案页 ---- */
export const fmtDay = t => { if (!t) return ''; const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function bondBar(id) {
  const s = stageOf(id), c = ST.cnt[id] || 0;
  if (s >= 5) return `<span class="bb heart"><i style="--p:100%"></i></span><small>${c} 盘</small>`;
  if (s >= 4) return `<span class="bb"><i style="--p:100%"></i></span><small>${c} 盘</small>`;
  const a = STAGES[s].n, b2 = STAGES[s + 1].n;
  return `<span class="bb"><i style="--p:${((c - a) / (b2 - a) * 100).toFixed(0)}%"></i></span><small>距「${STAGES[s + 1].k}」还差 ${b2 - c} 盘</small>`;
}
/* ---- 札记页：人物志 ----
   总览：羁绊、六位熟客的卡片（记下了多少）。点开一位看 TA 的人物页。 */
export function personCount(id) {
  const d = STORY[id], s = Math.min(stageOf(id), 4), known = oppKnown(id);
  const facts = known ? FACT_AT.filter(n => s >= n).length : 0, worries = s, heard = heardLines(id).length;
  return { got: (known ? 1 : 0) + facts + worries + heard, all: 1 + d.facts.length + d.worries.length + allLines(id).length, facts, worries, heard };
}
// 进札记（views/NotesView.vue）：「新」的标记算看过了
export function renderNotes() { if (ST.on && ST.freshW) { ST.freshW = 0; stSave(); } }

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  const s = load('story'); if (s && typeof s === 'object') Object.assign(ST, s);
  migrateOld();
  // 建角色时选了「不要剧情」：这个角色一开始就关着
  if (!s && PROFILE.cur && PROFILE.cur.st === 0) ST.on = false;
  // 对手的名字、棋路以这里为准（改字只改 story_data.js）
  OPPONENTS.forEach(o => { const d = STORY[o.id]; if (d) o.desc = d.style; });
  // 点熟客（札记卡片、档案页交情、结算卡「札记里多了一页」）直接翻到 TA 那页；从别处进札记回到总览
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-nt]');
    if (t) { e.preventDefault(); openPerson(t.dataset.nt); window.scrollTo(0, 0); return; }
  }, true);
  /* ---- 接到对局（core/hooks.js）：下完一盘先记剧情，再出结算卡 ---- */
  on('finishing', () => { try { S.storyRes = storyOnGame(); } catch (e) { S.storyRes = null; } });
  on('finished', () => {
    const sr = S.storyRes;
    if (sr && sr.ev) { const tk = S.token; setTimeout(() => { if (tk === S.token && !ui.layer.kind) showEvent(sr.ev); }, 1900); }
  });
  on('newGame', () => { S.storyRes = null; });
  if (!PROFILE.cur) setTimeout(() => showCreate(false), 0);

}
