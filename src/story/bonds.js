/* ================= 各人的故事、最后一步 =================
   剧情只有三样：交情（story.js）、各人的故事、最后一步。story.js 在下完一盘时调 bondsOnGame()。

   故事（arc）：到了知己，和 TA 每下 arcGap 盘演一步，共五步。各人的故事互不等待。
   最后一步（final）：故事走完再和 TA 下一盘，选做朋友还是说出心意。
         说出心意只看模样：异性（love 里有玩家的模样）；女性玩家和斜月、惊雷、如影另有一条路（special）。
         守中只做忘年之交。选定了就不再变。 */
import { STORY, STORY_RULE } from './story-data.js';
import { ST, playerG, stOverlay, stSave, stageOf } from './story.js';

export const isLove = id => ST.bond[id] === 'love' || ST.bond[id] === 'special';

/* ---- 各人的故事 ---- */
export const arcOf = id => ST.arc[id] || 0;
const sinceArc = id => (ST.cnt[id] || 0) - (ST.arcN[id] ?? 20);
// 还要再下几盘，故事讲到下一段
export const arcLeft = id => Math.max(1, STORY_RULE.arcGap - sinceArc(id));
function arcDue(id) {
  return stageOf(id) === 4 && arcOf(id) < STORY[id].arc.steps.length && sinceArc(id) >= STORY_RULE.arcGap;
}

/* ---- 最后一步 ---- */
// 说出心意是哪条路：love（异性）/ special（女性玩家和斜月、惊雷、如影）/ ''（只能做朋友）
export function romanceKind(id) {
  const d = STORY[id], g = playerG();
  if ((d.love || []).includes(g)) return 'love';
  if (g === 'f' && d.final.special) return 'special';
  return '';
}
// 羁绊的名字（挚友、情意、共此月……）
export function bondName(id) {
  const b = ST.bond[id], f = STORY[id].final; if (!b) return '';
  const t = (b === 'special' ? f.special : b === 'love' ? f.love : f.friend).bond;
  return t.replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, a, c) => playerG() === 'f' ? c : a);
}
// 选定了：friend / love / special
export function chooseBond(id, kind) {
  ST.bond[id] = kind; ST.bondT[id] = Date.now(); ST.bondN[id] = ST.total; ST.stage[id] = 5;
  stSave();
}
const finalDue = id => stageOf(id) === 4 && !ST.bond[id] && arcOf(id) >= STORY[id].arc.steps.length && sinceArc(id) >= 1;

/* ---- 下完一盘：这盘之后要演的一段（没有就是 null） ---- */
export function bondsOnGame(id) {
  if (!ST.on || !STORY[id]) return null;
  if (finalDue(id)) return { kind: 'final', id };
  if (arcDue(id)) return { kind: 'arc', id, i: arcOf(id) };
  return null;
}
// 演出来：故事在演的时候就记下；最后一步要等你选
export function showEvent(ev) {
  if (!ev) return;
  if (ev.kind === 'arc') {
    if (arcOf(ev.id) !== ev.i) return;
    ST.arc[ev.id] = ev.i + 1; ST.arcN[ev.id] = ST.cnt[ev.id] || 0;
    stSave(); return stOverlay('tale', { id: ev.id, i: ev.i }, 'tale');
  }
  stOverlay('bond', ev, 'bond lock');
}
// 札记里再看一遍
export const replayBond = id => stOverlay('bond', { kind: 'replay', id }, 'bond');
export const replayTale = d => stOverlay('tale', Object.assign({ replay: true }, d), 'tale');

// 旧存档：纸条、日子、亲密戏、撞见、老馆主这些都不要了；以前的「心意」换成现在的羁绊；已有羁绊的人故事算走完
const OLD_KEYS = ['heart', 'heartT', 'relic', 'dayCnt', 'visit', 'notes', 'noteIdx', 'nextNote', 'freshN', 'notePending', 'lnoteIdx',
  'declined', 'clash', 'flags', 'lp', 'seen', 'main'];
export function migrateOld() {
  const h = ST.heart;
  if (h && STORY[h] && !ST.bond[h]) { ST.bond[h] = romanceKind(h) || 'friend'; ST.bondT[h] = ST.heartT || Date.now(); ST.bondN[h] = ST.total; ST.stage[h] = 5; }
  for (const k of OLD_KEYS) delete ST[k];
  for (const id of Object.keys(ST.bond)) { if (STORY[id] && arcOf(id) < 5) ST.arc[id] = 5; }
}
