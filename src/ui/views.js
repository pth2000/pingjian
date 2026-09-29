/* ================= 页面：主页 / 对弈 / 定式 / 人机设置 / 战绩 / 棋谱 / 规则 ================= */
import { REC, S, oppOf, savePrefs } from './state.js';
import { closeSheet, showKeys } from './input.js';
import { layout, render } from './canvas.js';
import { RESET_TXT, syncBars, updateUI } from './panel.js';
import { ask, askResolve, closeAsk } from './dialogs.js';
import { ui, setupSel } from '../stores/ui.js';
import { renderAch } from '../features/achievements.js';
import { renderNotes } from '../story/story.js';
import { DIFFS } from '../engine/engine.js';
import { openBook } from '../openings/book-layout.js';
import { openPuzzles } from '../puzzles/puzzles.js';
import { inProgress } from './settings.js';
import { newGame } from '../game/new-game.js';
import { NT } from '../story/story.js';
import { emit } from '../core/hooks.js';
import { diffOf } from './state.js';
import { VIEW_TITLE } from './nav.js';
import { applyRuleset, rulesetNow } from '../game/rulesets.js';

// 路由由 app.js 建好后交给这里（不直接 import router.js：页面组件都 import 本模块，直接 import 会绕成环）
let router = null;
export function bindRouter(r) { router = r; }

export let VIEW = 'home';
// 点「对弈」：有没下完的棋就回到那盘；下完了、或者还没开过局，就去选对手开新局
const gameReady = () => !S.over && (S.moves.length > 0 || !!S.started);
export function navGame() { showView(gameReady() ? 'game' : 'setup'); }
// fromPop：由路由（前进 / 后退 / 打开地址）触发的，不必再通知路由
export function showView(v, fromPop) {
  if (!VIEW_TITLE[v]) v = 'home';
  const prev = VIEW; VIEW = v; ui.view = v;
  document.body.dataset.view = v;
  closeSheet();
  document.title = v === 'home' ? '枰间' : `${VIEW_TITLE[v]} · 枰间`;
  if (prev !== v) window.scrollTo(0, 0);
  if (v === 'game') { try { layout(); syncBars(); } catch (e) {} render(); updateUI(); }
  if (v === 'setup') renderSetup();
  if (v === 'ach') renderAch();
  if (v === 'notes') renderNotes();
  emit('view', v);
  if (!fromPop && router) {                        // 地址跟上：札记的人物页带上是谁
    const loc = { name: v, params: v === 'notes' && NT.sel ? { id: NT.sel } : {} };
    if (router.resolve(loc).fullPath !== router.currentRoute.value.fullPath) router.push(loc);
  }

}
// 双人对弈：设置页传入规则和是否猜先；不传就沿用现在的设置
export async function startPvp(o = {}) {
  if (inProgress() && !(await ask({ title: '开始双人对弈？', text: RESET_TXT, ok: '开始' }))) return;
  if (o.ruleSet) applyRuleset(o.ruleSet);
  if (o.nigiri !== undefined) S.nigiri = !!o.nigiri;
  S.mode = 'pvp'; S.practice = null; S.started = true; savePrefs();
  showView('game'); newGame();
}
/* ---- 开局前的设置页 —— 人机对弈：左边选对手，中间是对手档案，下面选难度、规则、执子；双人对弈：规则、猜先 ---- */
export const oppRec = id => { let w = 0, l = 0; for (const d of DIFFS) { const r = REC[id + '.' + d]; if (r) { w += r.w; l += r.l; } } return { w, l }; };
// 设置页：views/SetupView.vue；每次进来对手默认「随机」，其余跟着上一局
// 人物页「和 TA 下一盘」：进设置页，对手先选好
export function setupWith(id) { showView('setup'); setupSel.opp = id; }
// 设置页分人机对弈、双人对弈两种。keep：从主页「开始对局」或对弈页「更改设置」进来，对手也按上一局选好（随机的除外）
export function setupFor(mode, keep) { showView('setup'); setupSel.mode = mode; if (keep && !S.randOpp) setupSel.opp = oppOf(S.level); }
function renderSetup() { Object.assign(setupSel, { mode: 'ai', opp: 'rand', diff: diffOf(S.level), side: String(S.side || S.human), ruleSet: rulesetNow().id, first: S.opFirst === 'opp' ? 'opp' : 'me', nigiri: S.nigiri !== false }); }
export async function startAI() {
  if (inProgress() && !(await ask({ title: '开始新的一局？', text: RESET_TXT, ok: '开新局' }))) return;
  const o = setupSel.opp, df = setupSel.diff;
  S.mode = 'ai'; S.started = true;
  S.randOpp = o === 'rand';
  S.level = (o === 'rand' ? oppOf(S.level) : o) + '.' + df;
  S.human = S.side = +setupSel.side;
  applyRuleset(setupSel.ruleSet); S.opFirst = setupSel.first;
  S.practice = null; S.keepOpp = !S.randOpp; savePrefs();
  showView('game'); newGame();
}
// 快捷键：按当前页面给出对应的一张表
const KEYS_DS = `<table class="keys">
    <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>退一手 / 下一手（沿主线）</td></tr>
    <tr><td><kbd>Home</kbd> <kbd>End</kbd></td><td>回到第 3 手 / 沿主线走到底</td></tr>
    <tr><td><kbd>O</kbd></td><td>回到对弈</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>回主页</td></tr>
    <tr><td><kbd>?</kbd></td><td>显示这张表</td></tr></table>`;
const KEYS_PZ = `<table class="keys">
    <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>上一题 / 下一题</td></tr>
    <tr><td><kbd>H</kbd></td><td>提示</td></tr>
    <tr><td><kbd>R</kbd></td><td>重来</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>回主页</td></tr>
    <tr><td><kbd>?</kbd></td><td>显示这张表</td></tr></table>`;
export function showKeysHere() {
  if (VIEW === 'dingshi') return ask({ title: '定式 · 键盘快捷键', ok: '知道了', cancel: null, html: KEYS_DS });
  if (VIEW === 'shafa') return ask({ title: '杀法练习 · 键盘快捷键', ok: '知道了', cancel: null, html: KEYS_PZ });
  showKeys();
}

/* ---- 去某一页：按钮、页签、路由都走这里。定式、杀法、对弈进去之前要先把内容备好 ---- */
export function go(v) {
  if (v === 'pvp') setupFor('pvp');
  else if (v === 'dingshi') openBook();
  else if (v === 'shafa') openPuzzles();
  else if (v === 'game') navGame();
  else { if (v === 'notes') NT.sel = null; showView(v); }      // 从别处进札记（或人物页的返回键）回到总览
}

// 札记里翻到某人那一页（地址 /notes/某人）
export function openPerson(id) {
  NT.sel = id; showView('notes');
}
// 手机顶栏的返回：能退就退一步，否则回主页
export function goBack() {
  const st = router && router.options.history.state;
  if (st && st.back) router.back(); else go('home');
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  // 浏览器后退时先收起弹框；前进 / 后退 / 直接打开地址：进路由指向的那一页
  addEventListener('popstate', () => { if (askResolve) closeAsk(false); });
  router.afterEach(to => {
    if (to.name === 'notes') NT.sel = to.params.id || null;
    if (to.name && to.name !== VIEW) { if (to.name === 'notes') showView('notes', true); else go(to.name); }
  });
  document.addEventListener('keydown', e => {
    if (askResolve || !['dingshi', 'shafa'].includes(VIEW) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); showKeysHere(); }
  });
  /* ---- 键盘：Esc 从各个子页面回主页 ---- */
  document.addEventListener('keydown', e => {
    if (askResolve || e.isComposing || e.key !== 'Escape' || ['home', 'game', 'dingshi'].includes(VIEW)) return;
    e.preventDefault(); showView('home');
  });

}
