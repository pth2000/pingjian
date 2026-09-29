/* ---- 定式页、杀法页：棋盘边长由 CSS 定（styles/dingshi.css 的 .bk-stage 尺寸容器），这里只按现在的大小重画 ----
   电脑：开局列表 | 棋盘和翻谱条 | 说明和按钮；手机：开局条在上，棋盘、翻谱条、说明、按钮依次往下 */
import { VIEW, navGame, showView } from '../ui/views.js';
import { $ } from '../ui/state.js';
import { narrow } from '../ui/sound.js';
import { nextTick } from 'vue';
import { bt } from '../stores/boards.js';
import { BK, bkAnalyse, bkKey, bkState, dsPaint, mainKid, orderedKids } from './book-page.js';
import { pzPaint } from '../puzzles/puzzles.js';
import { bookState, isBook, tfTo } from './tree.js';
import { OPENINGS, opMoves } from './openings.js';
import { wkCall } from '../ui/worker-client.js';
import { pvLine, vcfLine, withBoard } from '../engine/engine.js';
import { askResolve, toast } from '../ui/dialogs.js';

// 棋盘最大 720：棋盘上面还有空（偏方的屏、大屏），开局名 / 题目标题挪到棋盘上面（bt.roomy），右栏那份藏起来
export function dsLayout() {
  const v = VIEW === 'dingshi' ? $('vDingshi') : VIEW === 'shafa' ? $('vShafa') : null; if (!v) return;
  const st = v.querySelector('.bk-stage');
  if (st && !narrow()) {
    const W = st.clientWidth, H = st.clientHeight - 60;            // 60：翻谱条连同间距
    if (W && H > 0) { const room = H - Math.min(W, H, 720); bt.roomy = room >= 72; }   // stage 是尺寸容器，高度不随里面的内容变
  } else bt.roomy = false;
  if (VIEW === 'dingshi') dsPaint(); else pzPaint();
}
// 定式页右栏（BookPanel.vue / PracticePanel.vue）：数据变了就通知它重算，画完再量尺寸、画棋盘
export function renderBookDetail() {
  bt.menu = false;
  nextTick(() => {
    dsLayout();
    const el = $('bkDetail'), seq = el && el.querySelector('.bk-seq');
    if (seq && BK.pr) seq.scrollTop = seq.scrollHeight;
    else if (seq) { const cur = seq.querySelector('.cur'); if (cur) seq.scrollTop = cur.offsetTop - seq.clientHeight + cur.offsetHeight + 6; }
  });
  if (!BK.op) return;
  const st = BK.hovSt = bkState();                 // 悬停的虚子要知道禁手点、是否已经连五
  if (!BK.pr) {                                    // 出了谱：让引擎算几个候选
    const bs = bookState(BK.line);
    if (!st.win && !(bs && bs.inBook && orderedKids(bs).length) && !BK.cache.get(bkKey(BK.line))) bkAnalyse();
  }
}
export function bkPush(i, src) {
  const bs = bookState(BK.line), k = bs && bs.inBook && bs.kids.find(q => q.i === i);
  BK.line.push(i); BK.src[BK.line.length - 1] = k ? (isBook(k) ? 'book' : 'ai') : src;
}
export function bkPlay(i, src = 'user') {
  if (BK.line.includes(i) || BK.job) return;
  const st = bkState(); if (st.win) return;
  if (st.forb.includes(i)) { toast('这是黑棋的禁手点，不能落子'); return; }
  if (BK.fwd.length && BK.fwd[BK.fwd.length - 1] === i) BK.fwd.pop(); else BK.fwd = [];   // 走的正是退回去的那手，就接着原来的路
  bkPush(i, src); renderBookDetail();
}
export function bkBack(k = 1) {
  while (k-- > 0 && BK.line.length > 3) { BK.fwd.push(BK.line.pop()); BK.src.length = BK.line.length; }
  renderBookDetail();
}
// 下一手：刚退回去的先走回来，否则沿主线
function bkStep() {
  if (bkState().win) return false;
  if (BK.fwd.length) { const i = BK.fwd.pop(); bkPush(i, 'user'); return true; }
  const k = mainKid(bookState(BK.line), BK.line); if (!k) return false;
  bkPush(k.i, 'book'); return true;
}
// 手顺里灰色的（退回去的）几手：点第 k 个就一路走回到那里
export function bkFwd(k) { while (k-- > 0 && BK.fwd.length) bkPush(BK.fwd.pop(), 'user'); renderBookDetail(); }
export function bkNext() { if (!BK.job && bkStep()) renderBookDetail(); }
export function bkToEnd() { if (BK.job) return; let g = 0; while (g++ < 90 && bkStep()) {} renderBookDetail(); }
export async function bkEngineLine(kind) {
  if (BK.job) return;
  const ms = BK.line.slice(), color = ms.length % 2 === 0 ? 1 : 2, tk = ++BK.busy;
  BK.job = kind; renderBookDetail();
  let r = kind === 'pv'
    ? await wkCall({ type: 'pv', color, n: 8, moves: ms, rule: 'renju' }, 40000)
    : await wkCall({ type: 'vcf', color, ms: 4000, moves: ms, rule: 'renju' }, 12000);
  if (!r) try { r = withBoard(ms, () => (kind === 'pv' ? { line: pvLine(color, 8) } : vcfLine(color, 4000))); } catch (e) { r = null; }
  BK.job = '';
  if (tk !== BK.busy || bkKey(BK.line) !== bkKey(ms)) { renderBookDetail(); return; }
  const seq = r && (r.line || r.seq) || [];
  if (kind === 'vcf' && !(r && r.done && seq.length)) { renderBookDetail(); toast(`${color === 1 ? '黑' : '白'}棋现在没有连续冲四的杀法`); return; }
  BK.fwd = [];
  seq.forEach(m => { if (!BK.line.includes(m)) bkPush(m, kind === 'vcf' ? 'vcf' : 'engine'); });
  renderBookDetail();
  if (kind === 'vcf') toast(`${color === 1 ? '黑' : '白'}棋连续冲四取胜，共 ${seq.length} 手`);
}
export function openBook(id, moves) {
  let o = OPENINGS.find(x => x.id === id) || null, line = null, src = null;
  if (moves && moves.length >= 3) {                  // 从对局打开：按谱的摆法换算，把实战手顺带进来
    const bs = bookState(moves);
    if (bs && (!o || bs.o === o)) { o = bs.o; line = moves.map(m => tfTo(bs.t, m)); src = line.map((m, k) => (k < 3 ? '' : k < 3 + bs.depth ? 'book' : 'user')); }
  }
  if (!o) o = BK.op || OPENINGS.find(x => x.id === '4D');
  const ok = line && !line.includes(-1);
  if (ok || o !== BK.op || !BK.line.length) { BK.pr = null; BK.op = o; BK.line = ok ? line : opMoves(o); BK.src = ok ? src : []; BK.fwd = []; BK.all = false; }
  showView('dingshi');
  renderBookDetail();
}
export function bkTrim(len) { while (BK.line.length > len) BK.fwd.push(BK.line.pop()); BK.src.length = BK.line.length; renderBookDetail(); }
// 换一个开局：从第 3 手开始看
export function pickOpening(id) {
  const o = OPENINGS.find(x => x.id === id); if (!o) return;
  BK.op = o; BK.line = opMoves(o); BK.src = []; BK.fwd = []; BK.all = false; BK.job = ''; BK.pr = null; BK.busy++;
  renderBookDetail();
}
// 「更多」菜单：点按钮开关，点别处收起；返回原来是不是开着
export function bkMenu(open) {
  const was = bt.menu; bt.menu = open;
  if (open) nextTick(() => { const f = document.querySelector('.bk-menu button:not(:disabled)'); f && f.focus({ preventScroll: true }); });
  return was;
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  addEventListener('resize', () => dsLayout());
  { const ro = new ResizeObserver(() => dsLayout()); ro.observe($('vDingshi')); ro.observe($('vShafa')); }
  document.addEventListener('keydown', e => {
    if (VIEW !== 'dingshi' || BK.pr || askResolve || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key, act = f => { e.preventDefault(); e.stopImmediatePropagation(); f(); };
    if (k === 'Escape') return act(() => { if (!bkMenu(false)) showView('home'); });
    if (k === 'o' || k === 'O') return act(() => navGame());
    if (BK.job) return;
    if (k === 'ArrowLeft') return act(() => bkBack(1));
    if (k === 'ArrowRight') return act(bkNext);
    if (k === 'Home') return act(() => bkTrim(3));
    if (k === 'End') return act(bkToEnd);
  }, true);
  document.addEventListener('click', e => { if (bt.menu && !e.target.closest('#bkMore, .bk-menu')) bkMenu(false); });
}

// 杀法练习题目：RenLib 附带的 VCF.lib（连续冲四题），已用本游戏引擎逐题验证有解；len 是最短解的手数（双方合计）
