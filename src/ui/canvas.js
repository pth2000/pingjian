/* ---- 画布 ---- */
import { $, S } from './state.js';
import { LETTERS, N, b } from '../engine/engine.js';
import { PVP, myColor, myTurn } from './sound.js';
import { DS } from '../openings/book-page.js';
import { gv } from '../stores/game-ui.js';
import { narrow } from './sound.js';
import { AWAY } from '../engine/engine.js';
import { opZone } from '../game/opening-rule.js';

export let canvas;
export let ctx;
// 鼠标悬停的虚子单独画在上面一层透明画布上，移动鼠标时不必重画整张棋盘
let hcv, hctx;
export let size = 600, cell = 37.5, dpr = 1, woodCache = null;
function applySize(px2) {
  const ns = Math.max(200, Math.round(px2)), nd = window.devicePixelRatio || 1;
  if (woodCache && ns === size && nd === dpr) return;     // 尺寸没变就不重做木纹
  size = ns;
  dpr = nd;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  cell = size / (N + 1);
  hcv.style.width = size + 'px'; hcv.style.height = size + 'px';
  hcv.width = canvas.width; hcv.height = canvas.height;
  woodCache = makeWood();
}
// 棋盘边长由 CSS 定：.frame 是 .board-wrap 这个容器里放得下的最大正方形（styles/game.css），这里只量一下，按它重做画布
// 棋盘不必无限放大：电脑上最大这么宽，多出来的高度拿来放对局卡和陪练（对局卡放到棋盘上面，再有空，陪练放到下面）
const BOARD_MAX = 720, CARD_H = 170;          // 对局卡连同间距大约这么高
// 竖着的平板：改成一栏（game.css 里同样的条件），棋盘下面留给陪练和页签
const STACK = '(min-width:821px) and (max-width:1279px) and (min-height:1000px) and (orientation:portrait)', HUD_H = 120, PANEL_MIN = 300;
export function layout() {
  const f = document.getElementById('frame'); if (!f || !canvas) return;
  const st = document.getElementById('gmStage');
  const gm = document.querySelector('.gm');
  if (st && gm && !narrow() && matchMedia(STACK).matches) {
    const side = Math.max(240, Math.min(st.clientWidth, BOARD_MAX, gm.clientHeight - CARD_H - HUD_H - PANEL_MIN - 28));
    gv.room = 2;
    st.style.setProperty('--bside', side + 'px');
    st.style.setProperty('--below', HUD_H + 'px');
  } else if (st && !narrow()) {                          // 左边这一栏：棋盘占不满高度时，上面放对局卡，再有空，下面放陪练
    const W = st.clientWidth, H = st.clientHeight;
    if (W && H) {
      // 空出来的高度够放对局卡（差一点也行，棋盘让一让），就放到棋盘上面；再有余，陪练放到下面
      let side = Math.min(W, H, BOARD_MAX), room = H - side, r = 0;
      if (room >= 100) { r = 1; side = Math.min(side, H - CARD_H); room = H - side - CARD_H; if (room >= 120) r = 2; }
      gv.room = r;
      st.style.setProperty('--bside', side + 'px');
      st.style.setProperty('--below', Math.max(0, room - 12) + 'px');
    }
  } else {
    gv.room = 0;
    const top = document.querySelector('.gm-top');
    if (gm && top && gm.clientHeight) {                // 竖着拿的手机：棋盘（屏宽）、局势行都放下后还空 44px 以上，陪练就多给两行
      const flat = matchMedia('(max-height:560px) and (min-width:620px)').matches;
      const spare = gm.clientHeight - top.offsetHeight - 48 - (innerWidth - 20) - 36 - 24;
      const tall = !flat && spare >= 44, t = document.getElementById('coachText');
      if (tall !== gm.classList.contains('hud-tall')) {
        gm.classList.toggle('hud-tall', tall);
        if (t && !gv.sayOpen) gv.sayMore = t.scrollHeight > t.clientHeight + 2;   // 行数变了，「展开」要重新判断
      }
    }
    const m = document.querySelector('.mc-meta.solo');   // 手机上棋盘下面那一行：地方不够被压扁了，就干脆不显示
    if (m) m.style.visibility = m.clientHeight >= 24 ? '' : 'hidden';
  }
  const w = Math.floor(f.clientWidth);
  if (w > 0) {
    applySize(w);
    const st = document.documentElement.style;
    st.setProperty('--bw', size + 'px');                                   // 棋盘边长
  }
  render();
}
// 重做木纹底图并重画
export function refreshWood() { woodCache = makeWood(); render(); }
export function makeWood(w = canvas.width, h = canvas.height) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const lg = g.createLinearGradient(0, 0, size * 0.6, size);
  lg.addColorStop(0, '#E7C589'); lg.addColorStop(0.45, '#DCB575'); lg.addColorStop(1, '#CFA25E');
  g.fillStyle = lg; g.fillRect(0, 0, size, size);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 细密纹理：多而淡，比少而重更像木头
  for (let k = 0; k < 130; k++) {
    const y0 = rnd() * size, amp = 2 + rnd() * 10, ph = rnd() * 6, fr = 0.003 + rnd() * 0.012;
    const dark = rnd() < 0.55;
    g.strokeStyle = `rgba(${dark ? '124,80,30' : '255,240,200'},${0.018 + rnd() * 0.045})`;
    g.lineWidth = 0.4 + rnd() * 1.2;
    g.beginPath();
    for (let x = -4; x <= size + 4; x += 6) { const y = y0 + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 2.7 + ph) * amp * 0.25; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  // 几处深色木节
  for (let k = 0; k < 5; k++) {
    const cx = rnd() * size, cy = rnd() * size, r = 6 + rnd() * 14;
    const kg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    kg.addColorStop(0, 'rgba(120,78,30,.10)'); kg.addColorStop(1, 'rgba(120,78,30,0)');
    g.fillStyle = kg; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  }
  // 暗角，让棋盘有厚度
  const vg = g.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,44,10,.16)');
  g.fillStyle = vg; g.fillRect(0, 0, size, size);
  // 边缘倒角
  g.strokeStyle = 'rgba(255,240,205,.5)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(0.6, size); g.lineTo(0.6, 0.6); g.lineTo(size, 0.6); g.stroke();
  g.strokeStyle = 'rgba(96,60,16,.34)';
  g.beginPath(); g.moveTo(size - 0.6, 0.6); g.lineTo(size - 0.6, size - 0.6); g.lineTo(0.6, size - 0.6); g.stroke();
  // 网格：发丝线，外框略重
  const hair = Math.max(0.6, 0.9 / dpr * dpr) * 0.75;
  g.strokeStyle = 'rgba(52,34,12,.68)';
  g.lineWidth = hair;
  for (let k = 0; k < N; k++) {
    const p = Math.round((cell + k * cell) * dpr) / dpr + (hair % 2 ? 0.5 / dpr : 0);
    g.beginPath(); g.moveTo(cell, p); g.lineTo(cell * N, p); g.stroke();
    g.beginPath(); g.moveTo(p, cell); g.lineTo(p, cell * N); g.stroke();
  }
  g.lineWidth = hair * 2.2; g.strokeStyle = 'rgba(52,34,12,.8)';
  g.strokeRect(cell, cell, cell * (N - 1), cell * (N - 1));
  // 星位：小一点，带柔边
  for (const [x, y] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) {
    const sx = cell + x * cell, sy = cell + y * cell, r = Math.max(2, cell * 0.085);
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, r * 1.8);
    sg.addColorStop(0, 'rgba(46,30,10,.92)'); sg.addColorStop(0.55, 'rgba(46,30,10,.85)'); sg.addColorStop(1, 'rgba(46,30,10,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, r * 1.8, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(72,48,16,.62)';
  g.font = `${Math.max(8.5, cell * 0.27)}px "JetBrains Mono", ui-monospace, monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k < N; k++) {
    g.fillText(LETTERS[k], cell + k * cell, cell * N + cell * 0.58);
    g.fillText(String(N - k), cell * 0.44, cell + k * cell);
  }
  return c;
}
export const px = i => cell + (i % N) * cell, py = i => cell + ((i / N) | 0) * cell;

// 每颗棋子有极小的偏移，像是手放上去的；手数、最后一手标记要跟着同一个圆心走
export function jit(i) {
  const h = (i * 2654435761) >>> 0;
  return [((h & 7) / 7 - 0.5) * cell * 0.03, (((h >> 3) & 7) / 7 - 0.5) * cell * 0.03];
}
export function drawStone(i, c, alpha = 1, scale = 1) {
  const x = px(i), y = py(i);
  const h = (i * 2654435761) >>> 0;
  const [jx, jy] = jit(i);
  const r = cell * (0.455 + ((h >> 6) & 7) / 7 * 0.012) * scale;
  const hx = x + jx - r * (0.33 + ((h >> 9) & 3) / 3 * 0.07);
  const hy = y + jy - r * (0.36 + ((h >> 11) & 3) / 3 * 0.07);
  ctx.save(); ctx.globalAlpha = alpha;
  if (alpha < 1) {                       // 预览用的虚子：不要投影，改用轮廓
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c === 1 ? 'rgba(24,25,24,.5)' : 'rgba(252,252,246,.66)';
    ctx.fill();
    ctx.setLineDash([cell * 0.09, cell * 0.07]);
    ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.strokeStyle = c === 1 ? 'rgba(10,10,10,.65)' : 'rgba(90,86,72,.7)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, Math.PI * 2); ctx.stroke();
    ctx.restore(); return;
  }
  // 投影：两层，近处硬、远处软
  ctx.beginPath(); ctx.arc(x + jx + r * 0.10, y + jy + r * 0.16, r * 0.99, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(48,30,8,.20)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x + jx + r * 0.05, y + jy + r * 0.08, r * 0.99, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(40,24,6,.26)'; ctx.fill();
  const g = ctx.createRadialGradient(hx, hy, r * 0.05, x + jx, y + jy, r);
  if (c === 1) { g.addColorStop(0, '#6A6C6A'); g.addColorStop(0.28, '#333534'); g.addColorStop(0.72, '#141514'); g.addColorStop(1, '#050505'); }
  else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.42, '#F6F5EF'); g.addColorStop(0.82, '#E4E3DA'); g.addColorStop(1, '#C3C2B7'); }
  ctx.beginPath(); ctx.arc(x + jx, y + jy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  // 边缘一圈暗色，白子尤其需要
  ctx.lineWidth = Math.max(0.5, r * 0.045);
  ctx.strokeStyle = c === 1 ? 'rgba(0,0,0,.45)' : 'rgba(120,116,100,.45)';
  ctx.beginPath(); ctx.arc(x + jx, y + jy, r - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
  // 高光
  ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.30, r * 0.20, -0.7, 0, Math.PI * 2);
  ctx.fillStyle = c === 1 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.7)';
  ctx.fill();
  ctx.restore();
}
// 所有动画共用一个帧循环：同一帧里不管有几处要求重画，都只画一次
let rafQueued = false;
function kick() { if (!rafQueued) { rafQueued = true; requestAnimationFrame(() => { rafQueued = false; render(); }); } }
let hoverDrawn = false;
export function drawHover() {
  const i = S.hover;
  const show = i >= 0 && S.sel < 0 && S.review < 0 && !S.over;
  if (!show && !hoverDrawn) return;
  hctx.setTransform(1, 0, 0, 1, 0, 0);
  hctx.clearRect(0, 0, hcv.width, hcv.height);
  hoverDrawn = false;
  if (!show) return;
  hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 行列坐标：朱色小签，盖住原来的字
  hctx.save();
  hctx.font = `600 ${Math.max(8.5, cell * 0.27)}px "JetBrains Mono", ui-monospace, monospace`;
  hctx.textAlign = 'center'; hctx.textBaseline = 'middle';
  const chip = (t, x, y) => {
    const w = Math.max(cell * 0.46, hctx.measureText(t).width + cell * 0.2), h = cell * 0.4;
    hctx.fillStyle = 'rgba(198,47,36,.92)';
    hctx.beginPath(); hctx.roundRect ? hctx.roundRect(x - w / 2, y - h / 2, w, h, h * 0.3) : hctx.rect(x - w / 2, y - h / 2, w, h); hctx.fill();
    hctx.fillStyle = '#FFF6F0'; hctx.fillText(t, x, y + 0.5);
  };
  chip(LETTERS[i % N], px(i), cell * N + cell * 0.58);
  chip(String(N - ((i / N) | 0)), cell * 0.44, py(i));
  hctx.restore();
  if (b[i] === 0 && !S.thinking && myTurn()) {
    const main = ctx; ctx = hctx;
    try { drawStone(i, myColor(), 0.45); } finally { ctx = main; }
  }
  hoverDrawn = true;
}
/* ---- 棋盘标记：对弈、定式、杀法共用这一套 ----
   1. 套在棋子上的圈（最后一手、连五、禁手判负、陪练说的那手、选定打点）：ringStone
      以棋子的实际圆心为圆心（棋子有极小的随机偏移），半径盖过棋子的投影，看上去才是正的
   2. 空点上的圈（威胁要挡的点、推荐点、对方的应手）：ringPoint，一律 0.42 格
      实线 = 该走的点（绿），虚线 = 要防的点 / 对方可能走的点（红）；自己的威胁点也用绿
   3. 候选点编号圆片（提示 1 / 2 / 3）：discPoint
   4. 禁手点红叉：markForb；最后一手：markLast（朱色小点，显示手数时改为套圈）
   颜色只用两种：绿（好、该走）和朱红（坏、要防、最后一手） */
const MK_RED = '#C62F24', MK_GREEN = '#1F6F5C';
const mkLW = () => Math.max(1.6, cell * 0.06);
const mkDash = () => [cell * 0.13, cell * 0.1];
function ringStone(j, col, { real = true, lw = mkLW(), grow = 0, alpha = 1 } = {}) {
  const [jx, jy] = real ? jit(j) : [0, 0];
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(px(j) + jx, py(j) + jy, cell * (0.5 + grow) + lw / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function ringPoint(j, col, dash = false, r = 0.42) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = mkLW();
  if (dash) ctx.setLineDash(mkDash());
  ctx.beginPath(); ctx.arc(px(j), py(j), cell * r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function discPoint(j, n, strong) {
  const x = px(j), y = py(j), r = cell * 0.42;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = strong ? 'rgba(31,111,92,.92)' : 'rgba(31,111,92,.5)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
  if (n) { ctx.font = `600 ${Math.max(9, cell * 0.34)}px "JetBrains Mono", ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#F4F7F4'; ctx.fillText(String(n), x, y + 0.5); }
  ctx.restore();
}
export function markForb(i) {
  const x = px(i), y = py(i), s = cell * 0.16;
  ctx.save(); ctx.strokeStyle = '#B3261E'; ctx.lineWidth = Math.max(1.5, cell * 0.06); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke(); ctx.restore();
}
export function markLast(i, numbered) {
  if (numbered) return ringStone(i, 'rgba(198,47,36,.9)', { lw: Math.max(1.4, cell * 0.05) });
  const [jx, jy] = jit(i), x = px(i) + jx, y = py(i) + jy, r = Math.max(2.2, cell * 0.085);
  ctx.save(); ctx.fillStyle = 'rgba(198,47,36,.95)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,235,.55)'; ctx.lineWidth = Math.max(0.6, cell * 0.02); ctx.stroke(); ctx.restore();
}
function tagAt(j, t, col) {                      // 棋子右上角一个小签：？
  const [jx, jy] = jit(j), x = px(j) + jx + cell * 0.38, y = py(j) + jy - cell * 0.38, r = cell * 0.2;
  ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFF8F2'; ctx.font = `700 ${Math.max(8, cell * 0.26)}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + 0.5); ctx.restore();
}
function drawMarks(m, shownSet) {
  const occ = j => (shownSet ? shownSet.has(j) : b[j] !== 0);     // 复盘时按摆出来的那几手算
  if (m.seq) {                                   // 手顺：编号的虚子
    ctx.save();
    ctx.font = `700 ${Math.max(8, cell * 0.34)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    m.seq.moves.forEach((j, k) => {
      if (occ(j)) return;
      const c = k % 2 === 0 ? m.seq.c : 3 - m.seq.c;
      drawStone(j, c, 0.72);
      ctx.fillStyle = c === 1 ? '#F4F2EA' : '#1B1B1B'; ctx.fillText(String(k + 1), px(j), py(j) + 0.5);
    });
    ctx.restore();
  }
  if (m.opp >= 0 && !occ(m.opp)) { drawStone(m.opp, 3 - (m.c || 1), 0.5); ringPoint(m.opp, MK_RED, true); }
  if (m.best >= 0 && !occ(m.best)) { drawStone(m.best, m.c || 1, 0.55); ringPoint(m.best, MK_GREEN); }
  if (m.bad >= 0 && (shownSet || occ(m.bad))) { ringStone(m.bad, MK_RED); tagAt(m.bad, '?', MK_RED); }
}
export function render() {
  if (!woodCache) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(woodCache, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 禁手点
  if (S.forb.length && S.review < 0) S.forb.forEach(markForb);
  if (S.clearAnim) {
    const { stones, t0 } = S.clearAnim, n0 = stones.length, now = performance.now();
    let alive = false;
    stones.forEach(([m, c], k) => {
      if (b[m] !== 0) return;                      // 新局里已经有子落在这里
      const delay = n0 > 1 ? (n0 - 1 - k) / (n0 - 1) * 220 : 0;
      const p = Math.min(1, Math.max(0, (now - t0 - delay) / 160));
      if (p >= 1) return;
      alive = true;
      ctx.save(); ctx.globalAlpha = 1 - p; drawStone(m, c, 1, 1 - 0.25 * p); ctx.restore();
    });
    if (alive) kick(); else S.clearAnim = null;
  }
  const RV = S.review >= 0;
  const shown = RV ? S.review : S.moves.length;
  const view = RV ? S.moves.slice(0, shown) : S.moves;
  const lastIdx = view.length - 1;
  let animating = false;
  view.forEach((i, n) => {
    let sc = 1;
    if (!RV && n === lastIdx && S.dropAt) {
      const t = Math.min(1, (performance.now() - S.dropAt) / 180);
      if (t < 1) { animating = true; sc = 1.18 - 0.18 * (1 - Math.pow(1 - t, 3)); }
    }
    drawStone(i, n % 2 === 0 ? 1 : 2, 1, sc);
  });
  if (animating) kick();
  if (RV && shown < S.moves.length) {            // 复盘时用虚影标出“实战的下一手”
    const nx = S.moves[shown];
    ctx.save(); ctx.globalAlpha = 0.35; drawStone(nx, shown % 2 === 0 ? 1 : 2, 0.35); ctx.restore();
    const sg = S.sugg[shown];                    // 引擎推荐的那一手：绿圈（讲解时由标注来画）
    if (!S.lesson && sg !== undefined && sg !== nx && sg >= 0 && b[sg] === 0) ringPoint(sg, MK_GREEN);
  }
  // 手数
  if (S.showNum) {
    ctx.font = `600 ${Math.max(8, cell * (S.moves.length > 99 ? 0.3 : 0.36))}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    view.forEach((i, n) => { const [jx, jy] = jit(i); ctx.fillStyle = n % 2 === 0 ? '#F2F2EC' : '#1B1B1B'; ctx.fillText(String(n + 1), px(i) + jx, py(i) + jy + 0.5); });
  }
  // 最后一手：朱印小方块
  if (view.length && !(S.winLine && (!RV || shown === S.moves.length))) markLast(view[view.length - 1], S.showNum);   // 连五时由连五的圈代替
  // 连五
  if (S.winLine && (!RV || shown === S.moves.length)) {
    const [a, z] = S.winLine;
    const p = S.winAnim ? Math.max(0, Math.min(1, (performance.now() - S.winAnim) / 520)) : 1;
    const e = 1 - Math.pow(1 - p, 3);
    for (const i of S.winCells) ringStone(i, MK_RED, { grow: 0.12 * (1 - e), alpha: e });
    ctx.save();
    ctx.strokeStyle = 'rgba(198,47,36,.9)'; ctx.lineWidth = Math.max(3, cell * 0.12); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px(a), py(a)); ctx.lineTo(px(a) + (px(z) - px(a)) * e, py(a) + (py(z) - py(a)) * e); ctx.stroke();
    ctx.restore();
    if (p < 1) kick();
  }
  // 威胁关键点
  if (S.threat && !S.over && S.showThreat && !RV) {
    const mine = !PVP() && S.threat.by === S.human, col = mine ? MK_GREEN : MK_RED;
    for (const j of S.threat.keys) if (b[j] === 0) ringPoint(j, col, true);
    ctx.save(); ctx.strokeStyle = col;
    // 新出现的威胁：关键点荡开一圈，提醒一下
    const age = performance.now() - (S.threatAt || 0);
    if (age < 0) kick();
    else if (age < 900) {
      const e = age / 900;
      ctx.setLineDash([]); ctx.globalAlpha = 0.55 * (1 - e); ctx.lineWidth = Math.max(1.5, cell * 0.05);
      for (const j of S.threat.keys) { if (b[j] !== 0) continue; ctx.beginPath(); ctx.arc(px(j), py(j), cell * (0.42 + 0.3 * e), 0, Math.PI * 2); ctx.stroke(); }
      kick();
    }
    ctx.restore();
  }

  if (S.op && !RV) drawOpening(S.op);
  // Pro / Long Pro：轮到人下第 3 手时，把不能下的中心区域标成淡红
  if (AWAY && !S.op && !RV && !S.over && S.moves.length === 2 && myTurn()) zoneRect(AWAY - 1, 'rgba(198,47,36,.08)', 'rgba(198,47,36,.4)');
  // 陪练的标注（game/marks.js）：复盘讲解时也画
  if (S.marks && (!RV || S.lesson)) drawMarks(S.marks, RV ? new Set(view) : null);
  // 陪练话里的坐标被指到：那一点荡开两圈
  if (S.flash) {
    const age = performance.now() - S.flash.t;
    if (age > 1400) S.flash = null;
    else {
      const j = S.flash.i, e = (age % 700) / 700, on = b[j] !== 0;
      if (on) { ringStone(j, MK_RED); ringStone(j, MK_RED, { grow: 0.3 * e, alpha: 0.9 * (1 - e) }); }
      else { ringPoint(j, MK_RED); ctx.save(); ctx.strokeStyle = MK_RED; ctx.lineWidth = mkLW(); ctx.globalAlpha = 0.9 * (1 - e); ctx.beginPath(); ctx.arc(px(j), py(j), cell * (0.42 + 0.3 * e), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      kick();
    }
  }
  // 陪练候选点：1 / 2 / 3
  // 提示：1 / 2 / 3 号候选点（只有一个时不标号）
  if (S.hints.length && !RV) S.hints.forEach((j, k) => { if (b[j] === 0) discPoint(j, S.hints.length > 1 ? k + 1 : 0, k === 0); });
  else if (S.hint >= 0 && b[S.hint] === 0 && !RV) discPoint(S.hint, 0, true);
  // 悬停：点亮所在行列的坐标
  const cur = S.sel;
  if (cur >= 0 && !RV && !S.over) {
    ctx.save();
    ctx.fillStyle = 'rgba(198,47,36,.85)';
    ctx.font = `600 ${Math.max(8.5, cell * 0.27)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LETTERS[cur % N], px(cur), cell * N + cell * 0.58);
    ctx.fillText(String(N - ((cur / N) | 0)), cell * 0.44, py(cur));
    ctx.restore();
  }
  // 悬停 / 选中
  const ghost = S.sel;
  if (ghost >= 0 && b[ghost] === 0 && !S.over && !S.thinking && myTurn() && !RV) {
    drawStone(ghost, myColor(), 0.7);
    {
      ctx.strokeStyle = MK_GREEN; ctx.lineWidth = 2;
      const s = cell * 0.5, x = px(ghost), y = py(ghost);
      ctx.strokeRect(x - s, y - s, s * 2, s * 2);
    }
  }
  // 隐藏禁手点：判负的那颗黑子套一个红圈叉
  if (S.forbLoss >= 0 && !RV && b[S.forbLoss] === 1) {
    const [jx, jy] = jit(S.forbLoss), x = px(S.forbLoss) + jx, y = py(S.forbLoss) + jy, s = cell * 0.2;
    ringStone(S.forbLoss, MK_RED);
    ctx.save(); ctx.strokeStyle = MK_RED;
    ctx.lineWidth = Math.max(2, cell * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke();
    ctx.restore();
  }
  drawHover();
}

// 以天元为中心、半径 r 路的方框（开局规则的落子范围）
function zoneRect(r, fill, line) {
  const a = (7 - r) * N + 7 - r, z = (7 + r) * N + 7 + r;
  ctx.save(); ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  const x0 = px(a) - cell / 2, y0 = py(a) - cell / 2, w = px(z) - px(a) + cell, h = py(z) - py(a) + cell;
  ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); ctx.restore();
}
// 开局规则（game/opening-rule.js）：摆开局时淡淡标出能摆的范围；打点画成带编号的虚黑子
function drawOpening(o) {
  ctx.save();
  const r = opZone();
  if (r >= 0) zoneRect(r, 'rgba(31,111,92,.10)', 'rgba(31,111,92,.45)');
  if (o.offers && o.offers.length) {
    ctx.setLineDash([]);
    ctx.font = `600 ${Math.max(9, cell * 0.36)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    o.offers.forEach((j, k) => {
      if (b[j] !== 0) return;
      drawStone(j, 1, 0.8);
      ctx.fillStyle = '#F2F2EC'; ctx.fillText(String(k + 1), px(j), py(j) + 0.5);
      if (o.step === 'pick') ringStone(j, MK_RED, { real: false });
    });
  }
  ctx.restore();
}
// 借用对弈页的画笔：把全局的画布状态临时指到定式棋盘上
export function dsWith(cv, fn) {
  const sv = [ctx, size, cell, dpr, woodCache];
  ctx = cv.getContext('2d'); size = DS.size; cell = DS.size / (N + 1); dpr = DS.dpr; woodCache = DS.wood;
  try { return fn(); } finally { [ctx, size, cell, dpr, woodCache] = sv; }
}

/* ---- 启动：接上对弈页的两层画布（GameView.vue）；鼠标悬停的虚子画在上面一层，移动鼠标时不必重画整张棋盘 ---- */
export function __init() {
  canvas = $('board'); ctx = canvas.getContext('2d');
  hcv = $('hoverLayer'); hctx = hcv.getContext('2d');
}
