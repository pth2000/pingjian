/* ---- 对弈页「设置」页签里各个控件改了以后做什么（只有显示和陪练；对局设置在设置页，见 views.js） ---- */
import { $, S, savePrefs } from './state.js';
import { hasOwnMove } from '../game/new-game.js';
import { scheduleAssess, updateUI } from './panel.js';
import { clack } from './sound.js';
import { layout, render } from './canvas.js';
import { threatInfo } from '../engine/engine.js';
import { greetLine, recent } from '../game/coach.js';
import { gv } from '../stores/game-ui.js';
import { load } from '../core/storage.js';

export function inProgress() {
  if (S.over || S.review >= 0) return false;
  if (S.op) return S.moves.length > 1;              // 开局规则摆到一半也算
  return hasOwnMove();                            // 至少下过一手自己的棋才算
}
export function onShowNum(v) { S.showNum = v; savePrefs(); render(); updateUI(); }
export function onSound(v) { S.sound = v; savePrefs(); updateUI(); if (S.sound) clack(1); }
export function onShowWR(v) {
  S.showWR = v; savePrefs();
  if (S.showWR && S.wr[S.moves.length] === undefined) scheduleAssess();
 
}
export function onShowThreat(v) {
  S.showThreat = v; savePrefs();
  S.threat = (S.showThreat && S.moves.length && !S.over) ? threatInfo(S.moves[S.moves.length - 1], S.moves.length % 2 === 0 ? 2 : 1) : null;
  render(); updateUI();
}
export function onCoachPick(id) {
  S.coachId = id; savePrefs();
  recent.length = 0;
  greetLine();
}
export function onGuard(v) { S.guard = [0, 1, 2].includes(+v) ? +v : 1; savePrefs(); updateUI(); }

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  if (load('perf') === 0) gv.perfOpen = false;
  { const ro = new ResizeObserver(() => layout()); ro.observe($('boardWrap')); ro.observe($('gmStage')); }   // 棋盘容器变了大小（窗口、复盘条……）就重画
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', render);
}
