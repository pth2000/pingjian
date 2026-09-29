/* ---- 定式练习：就在定式页的棋盘上练，你执一方，电脑按谱应；不用对弈的对手、难度、陪练设置，也不计战绩 ----
   你每下一手都当场对照谱：定式、AI 开局库的下法算“在谱上”；谱上标了疑问的、谱上没有的算“出谱”，会停下来让你选择悔一步还是接着下。
   电脑在谱上时按谱应（在几种好的下法里随机挑，免得每次都一样）；出了谱就用最强档的引擎算。 */
import { BK, bkState, orderedKids } from './book-page.js';
import { cName } from '../puzzles/puzzles.js';
import { bkPush, renderBookDetail } from './book-layout.js';
import { bookState, esc, isBad, isBook, moverWR, short } from './tree.js';
import { RESET_TXT } from '../ui/panel.js';
import { ACH, achCheck, achSave } from '../features/achievements.js';
import { PVP, coord } from '../ui/sound.js';
import { wkCall } from '../ui/worker-client.js';
import { CFG, think, topMoves, withBoard } from '../engine/engine.js';
import { inProgress } from '../ui/settings.js';
import { S, savePrefs } from '../ui/state.js';
import { VIEW, showView } from '../ui/views.js';
import { newGame } from '../game/new-game.js';
import { saveGame } from '../game/save.js';
import { ask, askResolve, toast } from '../ui/dialogs.js';

export function prStart(human) {
  const base = BK.line.slice();
  BK.pr = { human, base, ok: 0, off: 0, busy: 0, decide: false, show: null, cands: null, msg: null, over: false };
  BK.fwd = []; BK.all = false;
  const toMove = base.length % 2 === 0 ? 1 : 2;
  prSay('info', `练习开始：你执${cName(human)}，从第 ${base.length} 手之后接着下。${toMove === human ? '轮到你了，直接在棋盘上落子。' : '电脑先走。'}`);
  renderBookDetail();
  if (toMove !== human) prReply();
}
function prSay(kind, html) { BK.pr.msg = { kind, html }; }
const prTurn = () => (BK.line.length % 2 === 0 ? 1 : 2);
const noteOf = k => (k && k.n && k.n.t ? `：${esc(short(k.n.t))}` : '');
function prGoodKids(bs) { return bs && bs.inBook ? orderedKids(bs).filter(k => !isBad(k)) : []; }
export async function prPlay(i) {
  const P = BK.pr;
  if (!P || P.busy || P.decide || P.over || prTurn() !== P.human || BK.line.includes(i)) return;
  const st = bkState();
  if (st.win) return;
  if (st.forb.includes(i)) { toast('这是黑棋的禁手点，不能落子'); return; }
  const bs = bookState(BK.line), inBook = bs && bs.inBook && bs.kids.length, all = inBook ? orderedKids(bs) : [];
  const k = all.find(q => q.i === i), good = prGoodKids(bs).slice(0, 3);
  P.show = null; P.cands = null;
  bkPush(i, 'user');
  if (inBook && k && !isBad(k)) {
    P.ok++;
    if (P.ok >= 8 && !P.off) achCheck({ ev: 'dsok' });
    prSay('ok', isBook(k) ? `✓ ${coord(i)} 是定式${noteOf(k)}。` : `✓ ${coord(i)} 是开局库里的下法${moverWR(k) != null ? `（电脑估计你的胜率 ${Math.round(moverWR(k))}%）` : ''}。`);
  } else if (inBook) {
    P.off++; P.decide = true; P.show = good;
    prSay('bad', k ? `${coord(i)} 在谱上标为疑问手${noteOf(k)}。${good.length ? `更好的是 ${good.map(q => `<b>${coord(q.i)}</b>`).join('、')}（棋盘上标出来了）。` : ''}`
      : `出谱了：谱上这里是 ${good.map(q => `<b>${coord(q.i)}</b>`).join('、') || '别的下法'}（棋盘上标出来了）。`);
  } else prSay('info', `${coord(i)}。`);
  const st2 = bkState();
  if (st2.win) { P.over = true; P.decide = false; prSay('win', `${cName(st2.win)}棋连成五子。`); return renderBookDetail(); }
  renderBookDetail();
  if (!P.decide) prReply();
}
async function prReply() {
  const P = BK.pr; if (!P || P.over) return;
  const tk = ++BK.busy, color = prTurn(), t0 = performance.now();
  P.busy = tk; P.decide = false; renderBookDetail();
  const bs = bookState(BK.line), good = prGoodKids(bs);
  let m = -1, how = 'engine', pick = null;
  if (good.length) {                              // 在谱上：前三种好下法里挑一手，主线的机会大一些
    const pool = good.slice(0, 3), wts = [0.6, 0.25, 0.15].slice(0, pool.length);
    let r = Math.random() * wts.reduce((a, b2) => a + b2, 0);
    pick = pool[pool.length - 1];
    for (let j = 0; j < pool.length; j++) { r -= wts[j]; if (r <= 0) { pick = pool[j]; break; } }
    m = pick.i; how = isBook(pick) ? 'book' : 'ai';
  } else {
    const ms = BK.line.slice();
    const r = await wkCall({ type: 'think', level: 'wuming.master', color, moves: ms, rule: 'renju' }, 20000);
    m = r && r.move >= 0 ? r.move : -1;
    if (m < 0) try { m = withBoard(ms, () => think(color, CFG['wuming.master'])); } catch (e) { m = -1; }
  }
  const wait = 420 - (performance.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (!BK.pr || BK.busy !== tk) return;
  P.busy = 0;
  if (m < 0 || BK.line.includes(m)) { P.over = true; prSay('info', '电脑找不到可下的点，练习结束。'); return renderBookDetail(); }
  bkPush(m, how === 'engine' ? 'engine' : how);
  const st = bkState();
  if (st.win) { P.over = true; prSay('bad', `电脑在 ${coord(m)} 连成五子。点「悔一步」退回去再试试。`); return renderBookDetail(); }
  const nb = bookState(BK.line), more = prGoodKids(nb).length;
  if (!more && how !== 'engine' && !P.off && P.ok >= 2) {           // 按谱走完一条定式、没有出谱：这个开局算练通
    achCheck({ ev: 'dsend' });
    if (BK.op && !(ACH.drill || (ACH.drill = [])).includes(BK.op.id)) { ACH.drill.push(BK.op.id); achSave(); }
  }
  const said = P.msg && P.msg.kind === 'ok' ? P.msg.html + '<br>' : '';
  if (how === 'engine') prSay('info', `${said}电脑应 <b>${coord(m)}</b>（已经出谱，这手是电脑算的）。轮到你。`);
  else prSay('info', `${said}电脑按谱应 <b>${coord(m)}</b>${noteOf(pick)}${more ? '。轮到你。' : '。<br>定式到这里走完了，后面没有现成的谱，接着下就是电脑和你对弈。'}`);
  renderBookDetail();
}
export function prUndo() {
  const P = BK.pr; if (!P || P.busy) return;
  const min = P.base.length;
  if (BK.line.length <= min) return;
  do { BK.line.pop(); } while (BK.line.length > min && prTurn() !== P.human);
  BK.src.length = BK.line.length;
  P.decide = false; P.over = false; P.show = null; P.cands = null;
  prSay('info', '退回来了，再下一次。');
  renderBookDetail();
}
export function prRestart() {
  const P = BK.pr; if (!P) return;
  BK.busy++; BK.line = P.base.slice(); BK.src.length = BK.line.length;
  prStart(P.human);
}
export async function prHint() {
  const P = BK.pr; if (!P || P.busy || P.over || prTurn() !== P.human) return;
  const bs = bookState(BK.line), good = prGoodKids(bs);
  if (good.length) { P.show = good.slice(0, 3); P.cands = null; prSay('hint', `谱上的下法：${P.show.map((q, j) => `<b>${j + 1}. ${coord(q.i)}</b>${isBook(q) ? '' : '（开局库）'}`).join('　')}。`); return renderBookDetail(); }
  const tk = ++BK.busy; P.busy = tk; prSay('wait', '已经出谱了，让电脑算一下…'); renderBookDetail();
  const ms = BK.line.slice(), color = prTurn();
  let r = await wkCall({ type: 'top', color, k: 3, moves: ms, rule: 'renju' }, 9000);
  if (!r) try { r = { list: withBoard(ms, () => topMoves(color, 3)) }; } catch (e) { r = null; }
  if (!BK.pr || BK.busy !== tk) return;
  P.busy = 0;
  P.cands = r && r.list ? r.list.map(x => ({ m: x.m, kind: x.kind })) : [];
  prSay('hint', P.cands.length ? `电脑推荐：${P.cands.map((c, j) => `<b>${j + 1}. ${coord(c.m)}</b>`).join('　')}。` : '电脑也没找到好点。');
  renderBookDetail();
}
export function prEnd() { BK.busy++; BK.pr = null; renderBookDetail(); }
// 把当前局面带到对弈里，和对弈设置里的对手接着下完（只摆一次，之后的新对局照常从空盘开始）
export async function playFromHere(moves) {
  if (inProgress() && !(await ask({ title: '到对弈里接着下？', text: RESET_TXT, ok: '接着下' }))) return;
  if (PVP()) S.mode = 'ai';
  const human = moves.length % 2 === 0 ? 1 : 2;
  S.human = human;
  S.practice = moves.slice(); S.keepOpp = true; S.started = true; savePrefs();
  showView('game'); newGame();
  S.practice = null; try { saveGame(); } catch (e) {}
  toast(`已摆好第 ${moves.length} 手的局面，你执${human === 1 ? '黑' : '白'}`);
}
// 出谱后选「就这样接着下」
export function prGoOn() { if (!BK.pr) return; BK.pr.show = null; prReply(); }
/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  document.addEventListener('keydown', e => {
    if (VIEW !== 'dingshi' || !BK.pr || askResolve || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key, act = f => { e.preventDefault(); e.stopImmediatePropagation(); f(); };
    if (k === 'Escape') return act(prEnd);
    if (k === 'ArrowLeft') return act(prUndo);
    if (k === 'h' || k === 'H') return act(prHint);
    if (k === 'ArrowRight' || k === 'Home' || k === 'End') return act(() => {});
  }, true);

}
