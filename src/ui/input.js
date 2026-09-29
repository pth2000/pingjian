/* ---- 输入 ---- */
import { canvas, cell, drawHover, layout, render, size } from './canvas.js';
import { CENTER, N, b } from '../engine/engine.js';
import { $, S, savePrefs } from './state.js';
import { gv } from '../stores/game-ui.js';
import { actionsView } from '../game/view.js';
import { onSound } from './settings.js';
import { coachKeep, coachTake } from '../game/coach.js';
import { hideCoach, hideResult, humanPlay } from '../game/play.js';
import { RESET_TXT, syncBars, updateUI } from './panel.js';
import { myTurn, narrow } from './sound.js';
import { inProgress } from './settings.js';
import { newGame } from '../game/new-game.js';
import { giveHint, greetLine, renderSay, undoMove } from '../game/coach.js';
import { enterReview, exitReview, reviewGo } from '../game/review.js';
import { decodeGame, encodeGame, loadGame } from '../game/save.js';
import { VIEW } from './views.js';
import { openBook } from '../openings/book-layout.js';
import { ask, askResolve, toast } from './dialogs.js';
import { setRule } from '../engine/engine.js';
import { fitRuleset } from '../game/rulesets.js';
import { setupFor } from './views.js';
import { PVP } from './sound.js';
import { keepRulePref } from '../game/rulesets.js';

function cellFromEvent(e) {
  let x, y;
  if (e.target === canvas && typeof e.offsetX === 'number') { x = e.offsetX * (size / (canvas.clientWidth || size)); y = e.offsetY * (size / (canvas.clientHeight || size)); }   // 不触发重排
  else { const r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * (size / r.width); y = (e.clientY - r.top) * (size / r.height); }
  const gx = Math.round((x - cell) / cell), gy = Math.round((y - cell) / cell);
  if (gx < 0 || gx >= N || gy < 0 || gy >= N) return -1;
  return gy * N + gx;
}
export function nudge(dx, dy) {
  if (S.sel < 0 || S.over || S.thinking || !myTurn()) return;
  const x = Math.min(N - 1, Math.max(0, (S.sel % N) + dx));
  const y = Math.min(N - 1, Math.max(0, ((S.sel / N) | 0) + dy));
  S.sel = y * N + x;
  render(); updateUI();
}
function openSheet(tab) {
  if (tab) setTab(tab);
  hideResult();                                   // 结果卡在更上一层，不收起来会盖住面板
  document.body.classList.add('sheet'); gv.sheet = true;
  $('panel').scrollTop = 0;
}
export function closeSheet() { document.body.classList.remove('sheet'); gv.sheet = false; }
export function setTab(tab) { S.tab = tab; gv.tab = tab; }
// 「设置」按钮、手机右上角：手机上开关底部面板；电脑上在「设置」和刚才那页之间来回
let lastTab = 'log';
export function togglePanel() {
  if (narrow()) return gv.sheet ? closeSheet() : openSheet();
  if (gv.tab === 'set') setTab(lastTab); else { lastTab = gv.tab; setTab('set'); }
}
// 「新局」：对局进行中时问一句——沿用本局设置重新开始，或者去设置页改了再开
export async function askNewGame() {
  if (!inProgress()) return newGame();
  const r = await ask({ title: '开始新的一局？', text: RESET_TXT, ok: '沿用设置，重新开始', alt: '更改设置', cancel: '取消' });
  if (r === 'alt') changeSetup(); else if (r) newGame();
}
// 对弈页的「更改设置」：去设置页，当前的设置都已选好
export function changeSetup() { hideResult(); closeSheet(); setupFor(PVP() ? 'pvp' : 'ai', true); }
export function placeSel() { if (S.sel >= 0) humanPlay(S.sel); updateUI(); }
export function cancelSel() { S.sel = -1; render(); updateUI(); }
export function toggleReview() { if (S.review >= 0) exitReview(); else enterReview(S.moves.length); }
// 陪练解说开关（设置里的勾、左栏的「请 TA 在旁边陪练」、快捷键 C）
export function setCoach(on) {
  S.coach = !!on; savePrefs();
  if (!S.coach) { hideCoach(); S.say = ''; S.hints = []; render(); updateUI(); renderSay(); return; }
 
  greetLine(); layout(); render(); updateUI();
}
export async function copyCode() {
  const code = encodeGame();
  $('codeIn').value = code;
  try { await navigator.clipboard.writeText(code); toast('棋谱代码已复制'); }
  catch (e) { $('codeIn').select(); toast('已填入输入框，请手动复制'); }
}
export async function loadCode(e) {
  const g = decodeGame(e.target.value);
  if (!g) { toast('棋谱代码无法识别'); return; }
  if (inProgress() && !(await ask({ title: '载入这份棋谱？', text: RESET_TXT, ok: '载入' }))) return;
  keepRulePref(); S.rule = g.rule; S.openRule = 'free'; fitRuleset('rule'); setRule(S.rule);
  S.mode = 'pvp';                                 // 载入别人的棋谱时先进双人模式，避免 AI 抢着走
  savePrefs(); loadGame(g.moves, { settled: true }); enterReview(g.moves.length);
  e.target.value = ''; toast(`已载入 ${g.moves.length} 手棋谱`);
}
/* ---- 棋盘上的鼠标和触摸（GameView.vue 的 canvas 上） ---- */
export function boardMove(e) {
  if (e.pointerType !== 'mouse') return;
  const i = cellFromEvent(e);
  if (i !== S.hover) { S.hover = i; drawHover(); }
}
export function boardLeave() { S.hover = -1; drawHover(); }
// 触摸：点一下选位，再点同一处或按「落子」确认；位置不准时用方向键微调
export function boardDown(e) {
  if (e.pointerType === 'mouse' || S.review >= 0) return;
  const i = cellFromEvent(e);
  if (i < 0) return;
  gv.tapnote = true;
  if (S.sel === i) { humanPlay(i); updateUI(); return; }
  if (b[i] === 0 && !S.over && !S.thinking && myTurn()) { S.sel = i; render(); updateUI(); }
}
export function boardUp(e) {
  if (e.pointerType !== 'mouse' || S.review >= 0) return;
  const i = cellFromEvent(e);
  if (i < 0) return;
  S.sel = -1; humanPlay(i);
}
// 键盘快捷键（输入框里、弹框打开时不响应）
function moveCursor(dx, dy) {
  if (S.over || S.thinking || !myTurn() || S.pending) return;
  let cur = S.sel;
  if (cur < 0) cur = S.hover >= 0 ? S.hover : (S.moves.length ? S.moves[S.moves.length - 1] : CENTER);
  else cur = Math.min(N - 1, Math.max(0, cur % N + dx)) + Math.min(N - 1, Math.max(0, ((cur / N) | 0) + dy)) * N;
  S.sel = cur; S.hover = -1; drawHover(); render(); updateUI();
  // 用方向键下棋时把焦点移到棋盘，回车/空格就不会误触刚才聚焦的按钮
  if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
}
export function showKeys() {
  ask({ title: '键盘快捷键', ok: '知道了', cancel: null, html: `<table class="keys">
    <tr><td><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd></td><td>移动落子光标</td></tr>
    <tr><td><kbd>Enter</kbd> / <kbd>空格</kbd></td><td>在光标处落子</td></tr>
    <tr><td><kbd>N</kbd></td><td>新对局</td></tr>
    <tr><td><kbd>U</kbd> / <kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>悔棋</td></tr>
    <tr><td><kbd>H</kbd></td><td>提示</td></tr>
    <tr><td><kbd>R</kbd></td><td>复盘本局 / 退出复盘</td></tr>
    <tr><td><kbd>C</kbd></td><td>陪练解说 开 / 关</td></tr>
    <tr><td><kbd>M</kbd></td><td>落子音效 开 / 关</td></tr>
    <tr><td><kbd>O</kbd></td><td>在对弈和定式之间切换</td></tr>
    <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></td><td>切换 棋谱 / 数据 / 设置 页签</td></tr>
    <tr><td colspan="2" class="ksub">复盘时</td></tr>
    <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>上一手 / 下一手</td></tr>
    <tr><td><kbd>Home</kbd> <kbd>End</kbd></td><td>第一手 / 最后一手</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>退出复盘</td></tr>
    <tr><td colspan="2" class="ksub">陪练提醒出现时</td></tr>
    <tr><td><kbd>Enter</kbd></td><td>悔一步，改下建议点</td></tr>
    <tr><td><kbd>Esc</kbd></td><td>就下这里</td></tr>
    <tr><td><kbd>?</kbd></td><td>显示这张表</td></tr></table>` });
}
/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  setTab('log');
  window.addEventListener('resize', () => { if (!narrow() && gv.sheet) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && gv.sheet) { e.stopImmediatePropagation(); closeSheet(); } });
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (askResolve || e.isComposing || VIEW !== 'game') return;
    if (t && (t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'radio' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const k = e.key, lower = k.length === 1 ? k.toLowerCase() : k;
    const mod = e.ctrlKey || e.metaKey || e.altKey;
    if (mod && !((e.ctrlKey || e.metaKey) && lower === 'z')) return;
    const panelOpen = gv.sheet;
    const act = fn => { e.preventDefault(); fn(); };
    // 陪练提醒
    if (S.pending) {
      if (k === 'Enter') return act(coachTake);
      if (k === 'Escape') return act(coachKeep);
    }
    // 复盘
    if (S.review >= 0) {
      if (k === 'ArrowLeft' || k === 'ArrowUp') return act(() => reviewGo(-1));
      if (k === 'ArrowRight' || k === 'ArrowDown') return act(() => reviewGo(1));
      if (k === 'Home') return act(() => enterReview(0));
      if (k === 'End') return act(() => enterReview(S.moves.length));
      if (k === 'Escape' && !panelOpen) return act(exitReview);
    }
    if (lower === 's') return act(togglePanel);
    if (panelOpen) return;                          // 面板打开时，其余按键留给面板里的控件
    if ((t && t.tagName === 'INPUT') && k.startsWith('Arrow')) return;   // 方向键在单选框上时交给单选框
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[k] && S.review < 0) {
      if (S.over && S.moves.length && S.sel < 0) { if (k === 'ArrowLeft' || k === 'ArrowRight') act(() => enterReview(k === 'ArrowLeft' ? S.moves.length - 1 : S.moves.length)); return; }
      return act(() => moveCursor(...dirs[k]));
    }
    if ((k === 'Enter' || k === ' ') && S.sel >= 0 && S.review < 0) {
      if (t && t.tagName === 'BUTTON' && t !== canvas) return;       // 按钮上的回车还是按钮自己
      return act(() => { const i = S.sel; humanPlay(i); updateUI(); });
    }
    if (k === 'Escape' && S.sel >= 0) return act(() => { S.sel = -1; render(); updateUI(); });
    if (lower === 'n') return act(askNewGame);
    if (lower === 'u' || lower === 'z') return act(() => { if (!actionsView().undoOff) undoMove(); });
    if (lower === 'h') return act(() => { if (!actionsView().hintOff) giveHint(); });
    if (lower === 'r') return act(() => { if (S.moves.length) toggleReview(); });
    if (lower === 'c') return act(() => setCoach(!S.coach));
    if (lower === 'o') return act(() => openBook());
    if (lower === 'm') return act(() => { onSound(!S.sound); toast(S.sound ? '落子音效：开' : '落子音效：关'); });
    if (k === '1' || k === '2' || k === '3') return act(() => { const tab = ['log', 'data', 'set'][+k - 1]; if (narrow()) openSheet(tab); else setTab(tab); });
    if (k === '?' || (k === '/' && e.shiftKey)) return act(showKeys);
  });
  addEventListener('resize', () => { layout(); syncBars(); });
  addEventListener('orientationchange', () => setTimeout(layout, 200));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && gv.resultOn) hideResult(); });
}

// 会让棋局重开的设置：对局进行中时要再点一次确认
