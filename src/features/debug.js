/* ================= 彩蛋：调试面板 =================
   开关：连点左上角「弈」字印章 5 下（3 秒内）。开启后刊头多一个「调试」按钮，档案页也有入口。
   开关记在这台设备上（不分角色）；面板里改的是当前角色的数据。 */
import { OPP, S } from '../ui/state.js';
import { STAGES } from '../story/story-data.js';
import { ST, allLines, playerG, stClose, stOverlay, stSave, stageName, storyOnGame } from '../story/story.js';
import { arcOf, chooseBond, romanceKind, showEvent } from '../story/bonds.js';
import { ACH, ACHS, achSave } from './achievements.js';
import { VIEW, showView } from '../ui/views.js';
import { PROFILE } from '../core/profile.js';
import { OPPONENTS } from '../engine/engine.js';
import { ask, toast } from '../ui/dialogs.js';
import { reactive } from 'vue';
import { NT, resetST } from '../story/story.js';
import { loadDevice, saveDevice } from '../core/storage.js';
import { STORY } from '../story/story-data.js';

export const DBG = reactive({ on: false });
export function dbgSet(v) {
  DBG.on = !!v;
  saveDevice('gomoku_dbg', v ? '1' : null);
  toast(v ? '调试模式已开启：刊头多了「调试」按钮' : '调试模式已关闭');
}

/* ---- 数据操作 ---- */
export const dbgNow = () => Date.now();
export function dbgStageFor(n) { let s = 0; while (s < 4 && n >= STAGES[s + 1].n) s++; return s; }
export function dbgSetCnt(id, n) {
  n = Math.max(0, n | 0); ST.cnt[id] = n;
  const s = dbgStageFor(n);
  if (ST.bond[id] && s < 4) dbgUnbond(id);
  ST.stage[id] = ST.bond[id] ? 5 : s;
  ST.got = ST.got.filter(x => x.id !== id).concat(Array.from({ length: s }, (_, k) => ({ id, k, t: dbgNow() })));
  if (n && !ST.meet[id]) ST.meet[id] = dbgNow();
  ST.total = Object.values(ST.cnt).reduce((a, b) => a + (b | 0), 0);
}
export function dbgGame(id, out) {
  const keep = { mode: S.mode, level: S.level, winner: S.winner, human: S.human, moves: S.moves, mt: S.mt, winCells: S.winCells };
  let r = null;
  try {
    S.mode = 'ai'; S.level = id + '.normal'; S.human = 1; S.winner = out === 'win' ? 1 : out === 'lose' ? 2 : 0;
    S.moves = Array.from({ length: 29 }, (_, k) => 112 + (k % 2 ? -k : k)); S.mt = []; S.winCells = [];
    r = storyOnGame();
  } catch (e) { toast('模拟出错：' + e.message); } finally { Object.assign(S, keep); }
  return r;
}
// 最后一步：先到知己（已经有羁绊的先清掉），故事算走完，直接演
export function dbgFinal(id) {
  if (ST.bond[id]) dbgUnbond(id);
  if (!ST.cnt[id] || ST.cnt[id] < STAGES[4].n) dbgSetCnt(id, STAGES[4].n);
  ST.on = true; ST.arc[id] = STORY[id].arc.steps.length;
  return { kind: 'final', id };
}
// 故事往下走一步（不管隔了几盘）
export function dbgArc(id) {
  if (!ST.cnt[id] || ST.cnt[id] < STAGES[4].n) dbgSetCnt(id, STAGES[4].n);
  ST.on = true;
  const k = arcOf(id); if (k >= STORY[id].arc.steps.length) return null;
  return { kind: 'arc', id, i: k };
}
export function dbgUnbond(id) {
  delete ST.bond[id]; delete ST.bondT[id]; delete ST.bondN[id];
  ST.stage[id] = dbgStageFor(ST.cnt[id] || 0);
}
export function dbgLove(id) {
  const k = romanceKind(id); if (!k) return false;
  if (!ST.cnt[id] || ST.cnt[id] < STAGES[4].n) dbgSetCnt(id, STAGES[4].n);
  ST.arc[id] = STORY[id].arc.steps.length; chooseBond(id, k); return true;
}
export function dbgHearAll(id) { ST.heard[id] = allLines(id).flatMap(x => x.keys); }
export function dbgResetStory() { resetST(); }

/* ---- 面板 ---- */
export function dbgOpen() { stOverlay('dbg'); }
export function dbgAfter(msg) {
  stSave(); try { achSave(); } catch (e) {}
 
  try { if (typeof VIEW !== 'undefined' && VIEW !== 'game') showView(VIEW); } catch (e) {}
  if (msg) toast(msg);
}

// 面板上的按钮（data-d 说做什么）
export function dbgClick(e) {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const d = b.dataset.d, id = b.dataset.id;
  if (d === 'cnt') { dbgSetCnt(id, +b.dataset.n); return dbgAfter(`${OPP[id].name}：${ST.cnt[id]} 盘，${stageName(id)}`); }
  if (d === 'game') {
    const r = dbgGame(id, b.dataset.o); if (!r) return dbgAfter();
    const msg = `${OPP[id].name}说：${r.line.replace(/<[^>]+>/g, '')}${r.ups.length ? ` · 升到${STAGES[r.ups[r.ups.length - 1]].k}` : ''}`;
    dbgAfter(msg);
    if (r.ev) setTimeout(() => showEvent(r.ev), 300);
    return;
  }
  if (d === 'final') { const ev = dbgFinal(id); stSave(); return showEvent(ev); }
  if (d === 'love') { if (!dbgLove(id)) { toast(`${OPP[id].name}和现在的模样只能做朋友`); return; } return dbgAfter(`和${OPP[id].name}成了恋人`); }
  if (d === 'unbond') { OPPONENTS.forEach(o => { if (ST.bond[o.id]) dbgUnbond(o.id); }); return dbgAfter('羁绊都清除了'); }
  if (d === 'arc') { const ev = dbgArc(id); if (!ev) { toast(`${OPP[id].name}的故事已经走完了`); return; } stSave(); return showEvent(ev); }
  if (d === 'hear') { dbgHearAll(id); return dbgAfter(`${OPP[id].name}的台词都听过了`); }
  if (d === 'hearAll') { OPPONENTS.forEach(o => dbgHearAll(o.id)); return dbgAfter('所有台词都听过了'); }
  if (d === 'unhear') { ST.heard = {}; return dbgAfter('听过的话已清空'); }
  if (d === 'all') { OPPONENTS.forEach(o => { if ((ST.cnt[o.id] || 0) < +b.dataset.n) dbgSetCnt(o.id, +b.dataset.n); }); return dbgAfter('六人都到知己了'); }
  if (d === 'on') { ST.on = !ST.on; return dbgAfter(ST.on ? '剧情模式已开启' : '剧情模式已关闭'); }
  if (d === 'g') { PROFILE.set('g', playerG() === 'f' ? 'm' : 'f'); return dbgAfter(`模样换成${playerG() === 'f' ? '红袖' : '青衫'}`); }
  if (d === 'achAll') { ACHS.forEach(a => { if (!ACH.got[a.id]) ACH.got[a.id] = dbgNow(); }); return dbgAfter('成就全部解锁'); }
  if (d === 'achNone') { ACH.got = {}; ACH.fresh = []; return dbgAfter('成就已清空'); }
  if (d === 'reset') { stClose(); ask({ title: '重置剧情数据？', text: '交情、故事、羁绊、听过的话都会清空（战绩、棋谱、成就不动）。', ok: '重置', danger: true }).then(ok => { if (ok) { dbgResetStory(); stSave(); dbgOpen(); dbgAfter('剧情数据已重置'); } else dbgOpen(); }); return; }
  if (d === 'nav') { stClose(); NT.sel = null; return showView(b.dataset.v); }
  if (d === 'off') { stClose(); dbgSet(false); }
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  DBG.on = loadDevice('gomoku_dbg') === '1';
  // 彩蛋：连点印章
  (() => {
    let n = 0, t0 = 0;
    document.addEventListener('click', e => {
      if (!e.target.closest('.brand .seal')) return;
      const now = Date.now(); if (now - t0 > 3000) n = 0; if (!n) t0 = now; n++;
      if (n >= 5) { n = 0; if (DBG.on) dbgOpen(); else dbgSet(true); }
    });
  })();
 
}
