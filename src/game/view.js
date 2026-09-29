/* 对弈页要显示的东西：都从棋局数据 S（响应式）算出来，给 components/game/ 下的组件的 computed 用。
   这里只读数据、不改数据，也不碰 DOM。 */
import { ptag } from './marks.js';
import { LEVEL_FULL, LEVEL_NAME, OPP, OPP_COL, REC, S, oppOf, rateOf } from '../ui/state.js';
import { PVP, coord, myTurn, toMove } from '../ui/sound.js';
import { ui } from '../stores/ui.js';
import { OPPONENTS, b, colorName } from '../engine/engine.js';
import { hintLabel } from '../openings/hints.js';
import { hasOwnMove, styleRead, STYLE_AX, STYLE_BASE, styX } from './new-game.js';
import { blunderTag, moveDeltas } from './review.js';
import { openingView } from './opening-rule.js';
import { canResign } from './play.js';

/* ---- 左上角的状态 ---- */
export function statusView() {
  const c = toMove(), n = S.moves.length;
  const last = n ? `上一手 ${coord(S.moves[n - 1])}` : '';
  let main = '', sub = '', warn = false;
  if (S.over && PVP()) {
    if (S.winner === 0) { main = '和棋'; sub = '棋盘已满，不分胜负。'; }
    else { main = `${colorName(S.winner)}棋胜`; sub = `五连成线 · 共 ${n} 手`; }
  } else if (S.over) {
    if (S.winner === 0) { main = '和棋'; sub = '棋盘已满，不分胜负。'; }
    else if (S.winner === S.human) { main = '你赢了'; sub = `${colorName(S.winner)}棋五连 · 共 ${n} 手`; }
    else { main = `${LEVEL_NAME[S.level]}获胜`; sub = `${colorName(S.winner)}棋五连 · 可以悔棋再试`; }
  } else if (S.thinking) {
    main = S.busyLabel;
    sub = `${PVP() ? '双人对弈' : LEVEL_NAME[S.level]} · 第 ${n + 1} 手${last ? ' · ' + last : ''}`;
  } else if (PVP()) {
    main = `轮到${colorName(c)}棋`;
    sub = `第 ${n + 1} 手`;
    if (S.hint >= 0) sub = hintLabel() + ' · ' + sub;
    else if (last) sub += ' · ' + last;
    if (S.forb.length) sub += ' · 红叉为禁手';
  } else if (c === S.human) {
    main = '轮到你落子';
    sub = `你执${colorName(S.human)} · 第 ${n + 1} 手`;
    if (S.hint >= 0) sub = hintLabel() + ' · ' + sub;
    else if (last) sub += ` · ${LEVEL_NAME[S.level]}` + last.replace('上一手 ', '落在 ');
    if (S.forb.length) sub += ' · 红叉为禁手';
  } else { main = `等待${LEVEL_NAME[S.level]}`; }
  if (S.opNote && !S.op && !S.over && S.review < 0 && S.moves.length <= S.opNote.n + 1) sub = S.opNote.text;   // 开局规则刚走完：说一下谁执黑
  if (S.op && !S.over && S.review < 0) {            // 开局规则还没走完
    const o = openingView();
    main = o.title; sub = o.busy ? `${o.who}思考中` : `轮到${o.who}`;
  }
  if (S.over && S.resigned && S.review < 0) {       // 认输结束
    main = PVP() ? `${colorName(S.winner)}棋胜` : `${LEVEL_NAME[S.level]}获胜`;
    sub = `${PVP() ? colorName(S.resigned) + '方' : '你'}在第 ${n} 手后认输`;
  }
  if (S.settled && !S.over && S.review < 0 && !S.op) sub += ' · 续下，不计战绩';   // 下完后悔棋 / 接着下
  if (S.review >= 0) { main = '复盘中'; sub = `第 ${S.review} 手 / 共 ${S.moves.length} 手${ui.narrow ? '' : ' · 方向键翻手'}`; }
  // 隐藏禁手点：黑棋下到禁手判负
  if (S.over && S.forbLoss >= 0 && S.review < 0) {
    sub = `${coord(S.forbLoss)} ${S.forbWhy || '禁手'} · 禁手判负`;
    if (PVP()) main = '白棋胜';
  }
  return {
    win: S.over && S.winner !== 0 && (PVP() || S.winner === S.human), warn,
    dot: 'dot' + ((S.over ? (S.winner || c) : c) === 2 ? ' white' : '') + (S.thinking ? ' thinking' : ''),
    main, sub,
  };
}

/* ---- 威胁提示 ---- */
const THREAT_TEXT = {
  live4:   { mine: '你成活四了，两头都能连五，对手挡不住。', foe: '对手成活四，两头都能成五，已经挡不住了。' },
  four3:   { mine: '你走出四三：对手只能挡冲四，之后你可以成活四。', foe: '对手四三：挡住冲四之后他还有活三，形势危险。' },
  rush4:   { mine: '你冲四了，对手必须挡在 {k}。', foe: '对手冲四，你必须挡在 {k}，否则下一手就连五。' },
  double3: { mine: '你形成双活三，对手只能挡一边。', foe: '对手双活三，只挡一边不够，考虑先冲四反击。' },
  live3:   { mine: '你形成活三，下一手可在 {k} 成活四。', foe: '对手形成活三，建议挡在 {k}。' },
};
export function threatView() {
  const t = S.threat;
  if (!t || !S.showThreat || S.over) return null;
  const mine = !PVP() && t.by === S.human, tpl = THREAT_TEXT[t.kind];
  let text = PVP()
    ? tpl.foe.replace('对手', `${colorName(t.by)}棋`).replace('你必须', `${colorName(3 - t.by)}棋必须`)
    : (mine ? tpl.mine : tpl.foe);
  const ks = t.keys.filter(j => b[j] === 0).map(coord);
  text = text.replace('{k}', ks.slice(0, 2).join(' 或 ') || '关键点');
  return { mine, text, html: text.replace(/([A-O]\d{1,2})/g, '<b>$1</b>') };
}

/* ---- 底部按钮 ---- */
export function actionsView() {
  const rv = S.review >= 0;
  const canPlace = S.sel >= 0 && b[S.sel] === 0 && !S.over && !S.thinking && myTurn() && !S.pending;
  return {
    nudge: canPlace && ui.narrow,
    place: canPlace ? `落子 ${coord(S.sel)}` : '落子',
    over: S.over && S.review < 0,                // 下完了：「新局」变成醒目的「再来一局」
    undoLabel: PVP() ? '悔一步' : '悔棋',
    undoOff: S.thinking || !hasOwnMove() || rv || !!S.op,
    hintOff: S.thinking || S.over || !myTurn() || rv || !!S.op,
    resign: !S.over && rv === false,               // 下完了就不显示「认输」
    resignOff: !canResign(),
  };
}

/* ---- 棋谱（左栏和面板里各一份） ---- */
export function logRows() {
  const ds = moveDeltas(), n = S.moves.length, rows = [];
  const cell = k => (S.moves[k] === undefined ? null
    : { k, sym: k % 2 === 0 ? '●' : '○', c: coord(S.moves[k]), tag: blunderTag(ds[k]), cur: S.review >= 0 && S.review === k + 1 });
  for (let k = 0; k < n; k += 2) rows.push({ no: k / 2 + 1, last: S.review < 0 && k >= n - 2, a: cell(k), b: cell(k + 1) });
  return rows;
}
// 复盘要点：让形势明显变差的几手
export function blunderList() {
  if (S.moves.length < 4) return [];
  return moveDeltas().map((d, k) => ({ d, k })).filter(x => x.d !== null && x.d <= -12).sort((a, z) => a.d - z.d).slice(0, 4).map(({ d, k }) => {
    const c = k % 2 === 0 ? 1 : 2;
    return { k, who: PVP() ? `${colorName(c)}棋` : (c === S.human ? '你' : LEVEL_NAME[S.level]), at: coord(S.moves[k]), tag: `${blunderTag(d)} ${Math.round(d)}%` };
  });
}

/* ---- 胜率 ---- */
export function wrSeries() {                  // 还没算出来的点用前一手的值
  const out = [];
  for (let k = 0; k <= S.moves.length; k++) out.push(S.wr[k] !== undefined ? S.wr[k] : (out.length ? out[out.length - 1] : 50));
  return out;
}
function verdictOf(pb, note) {
  if (note) return note;
  const d = pb - 50, side = d > 0 ? '黑' : '白', a = Math.abs(d);
  if (a < 5) return '均势';
  if (a < 15) return `${side}棋稍优`;
  if (a < 30) return `${side}棋优势`;
  return `${side}棋大优`;
}
export function wrView() {
  const ser = wrSeries(), n = ser.length - 1, cur = ser[n], pb = Math.round(cur);
  return {
    ser, n, cur, pb, pw: 100 - pb,
    verdict: S.over ? (S.winner ? `${colorName(S.winner)}棋胜` : '和棋') : verdictOf(cur, S.wrNote[n] || ''),
  };
}
// 走势图：单调三次插值，曲线不会冲过数据点
export function wrChartSvg(ser, W, H, hover) {
  const n = ser.length - 1, pad = 5;
  const X = k => (n ? (k / n) * (W - 2 * pad) : 0) + pad, Y = v => pad + (1 - v / 100) * (H - 2 * pad);
  const P = ser.map((v, k) => [X(k), Y(v)]);
  let line = '';
  if (P.length === 1) line = `M${pad},${Y(ser[0])}L${W - pad},${Y(ser[0])}`;
  else {
    line = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let k = 0; k < P.length - 1; k++) {
      const p0 = P[k], p1 = P[k + 1], cx = (p0[0] + p1[0]) / 2;
      line += `C${cx.toFixed(1)},${p0[1].toFixed(1)} ${cx.toFixed(1)},${p1[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    }
  }
  const y50 = Y(50);
  let h = `<defs>
    <linearGradient id="wrUp" x1="0" y1="${pad}" x2="0" y2="${y50}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--ink)" stop-opacity=".22"/><stop offset="1" stop-color="var(--ink)" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="wrDn" x1="0" y1="${y50}" x2="0" y2="${H - pad}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--seal)" stop-opacity="0"/><stop offset="1" stop-color="var(--seal)" stop-opacity=".20"/>
    </linearGradient>
    <clipPath id="wrAbove"><rect x="0" y="${pad - 2}" width="${W}" height="${Math.max(0, y50 - pad + 2)}"/></clipPath>
    <clipPath id="wrBelow"><rect x="0" y="${y50}" width="${W}" height="${Math.max(0, H - pad - y50 + 2)}"/></clipPath>
  </defs>`;
  if (n) {
    const area = `${line}L${X(n).toFixed(1)},${y50.toFixed(1)}L${X(0).toFixed(1)},${y50.toFixed(1)}Z`;
    h += `<path d="${area}" fill="url(#wrUp)" clip-path="url(#wrAbove)"/>`;
    h += `<path d="${area}" fill="url(#wrDn)" clip-path="url(#wrBelow)"/>`;
  }
  if (H > 140) for (const v of [25, 75]) {      // 图够高时加两条淡辅助线
    h += `<line x1="${pad}" x2="${W - pad}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--rule)" stroke-width="1"/>`;
    h += `<text x="${W - pad}" y="${Y(v) - 5}" text-anchor="end" font-size="9.5" fill="var(--muted)" font-family="var(--mono)" opacity=".6">${v}%</text>`;
  }
  h += `<line x1="${pad}" x2="${W - pad}" y1="${y50}" y2="${y50}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 4" opacity=".55"/>`;
  h += `<text x="${W - pad}" y="${y50 - 5}" text-anchor="end" font-size="9.5" fill="var(--muted)" font-family="var(--mono)" opacity=".8">50%</text>`;
  h += `<path d="${line}" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  const on = hover >= 0 && hover <= n, hi = on ? hover : n;
  if (on) h += `<line x1="${X(hi)}" x2="${X(hi)}" y1="${pad}" y2="${H - pad}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 3" opacity=".8"/>`;
  h += `<circle cx="${X(hi)}" cy="${Y(ser[hi])}" r="7" fill="var(--ink)" opacity=".12"/>`;
  h += `<circle cx="${X(hi)}" cy="${Y(ser[hi])}" r="3.6" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.6"/>`;
  let tip = null;
  if (on) { const v = Math.round(ser[hi]); tip = { text: `${hi ? `第 ${hi} 手后` : '开局'} · 黑 ${v}% · 白 ${100 - v}%`, left: Math.min(Math.max(X(hi), 70), W - 70) }; }
  return { svg: h, tip };
}

/* ---- 数据页：这个对手（或双人）的战绩 ---- */
export function recView() {
  if (PVP()) {
    const q = REC.pvp, t = q.b + q.w + q.d;
    return {
      cap: '双人对弈', lw: '黑胜', ll: '白胜', lr: '总局数', ls: '连胜', w: q.b, l: q.w, d: q.d, rate: t,
      streak: q.run ? `${colorName(q.runColor)} ${q.run}` : '–',
      foot: t ? `黑棋胜率 ${Math.round(q.b / t * 100)}% · 白棋胜率 ${Math.round(q.w / t * 100)}%` : '还没有完成的双人对局。',
    };
  }
  const r = REC[S.level];
  return {
    cap: `对阵${LEVEL_FULL[S.level]}`, lw: '胜', ll: '负', lr: '胜率', ls: '当前连胜', w: r.w, l: r.l, d: r.d, rate: rateOf(r), streak: r.streak,
    foot: (r.w + r.l + r.d) ? `最佳连胜 <b>${r.best}</b>${r.fast ? ` · 最快获胜 <b>${r.fast}</b> 手` : ''}` : '这个组合还没有完成的对局。',
  };
}

/* ---- 本局表现：两边对照 ---- */
export function perfView() {
  const n = S.moves.length;
  if (n < 2) return null;
  const sides = PVP() ? [1, 2] : [S.human, 3 - S.human];
  const label = c => PVP() ? `${colorName(c)}棋` : (c === S.human ? '你' : LEVEL_NAME[S.level]);
  const ds = moveDeltas();
  const st = c => {
    const o = { t: 0, tn: 0, l3: 0, f4: 0, q: 0, qq: 0, peak: null, best: null };
    for (let k = c === 1 ? 0 : 1; k < n; k += 2) {
      if (S.mt && S.mt[k] > 0) { o.t += S.mt[k]; o.tn++; }
      const kd = S.kinds && S.kinds[k];
      if (kd === 'live3' || kd === 'double3') o.l3++;
      if (kd === 'rush4' || kd === 'four3' || kd === 'live4') o.f4++;
      const d = ds[k];
      if (d !== null && d !== undefined) { if (d <= -25) o.qq++; else if (d <= -12) o.q++; if (o.best === null || d > o.best) o.best = d; }
    }
    for (let k = 0; k < S.wr.length; k++) { const v = S.wr[k]; if (v === undefined) continue; const mine = c === 1 ? v : 100 - v; if (o.peak === null || mine > o.peak) o.peak = mine; }
    return o;
  };
  const A = st(sides[0]), B = st(sides[1]);
  const sec = o => o.tn ? (o.t / o.tn / 1000).toFixed(o.t / o.tn < 10000 ? 1 : 0) + 's' : '–';
  const pct = v => v === null ? '–' : Math.round(v) + '%';
  const best = o => o.best === null ? '–' : (o.best > 0 ? '+' : '') + Math.round(o.best) + '%';
  const reveal = S.over || S.review >= 0;          // 评估类数据等于提示，对局中不显示
  const rows = [
    ['平均每手', sec(A), sec(B), true], ['活三', A.l3, B.l3], ['冲四 / 四三', A.f4, B.f4],
    ['疑问手 ?', A.q, B.q, false, true], ['败着 ??', A.qq, B.qq, false, true],
    ['最佳一手', best(A), best(B), true], ['最高胜率', pct(A.peak), pct(B.peak), true],
  ].slice(0, reveal ? 7 : 3).map(([k, a, z, opt, bad]) => ({ k, a, b: z, opt: !!opt, hiA: bad && +a > 0, hiB: bad && +z > 0 }));
  return { heads: sides.map(c => ({ c, label: label(c) })), rows, reveal };
}

/* ---- 棋风读数 ---- */
export function styView() {
  const sides = PVP() ? [1, 2] : [S.human, 3 - S.human];
  const A = styleRead(sides[0]), B = styleRead(sides[1]);
  const o = PVP() ? null : OPP[oppOf(S.level)];
  const nameA = PVP() ? `${colorName(sides[0])}棋` : '你', nameB = PVP() ? `${colorName(sides[1])}棋` : o.name;
  const v = { col: o ? OPP_COL[o.id] : 'var(--muted)', nameA, nameB, oName: o && o.name, wait: !A && !B, axes: [], sum: '' };
  if (v.wait) return v;
  const usual = o ? STYLE_BASE[o.id] : null;
  v.axes = STYLE_AX.map(([k, l, r]) => ({ k, l, r, u: usual ? styX(k, usual[k]) : null, b: B ? styX(k, B[k]) : null, a: A ? styX(k, A[k]) : null }));
  // 一句话总结：偏离参照最大的那一项
  const lean = (R0, ref) => {
    let best = null;
    for (const [k, l, r, sc] of STYLE_AX) { const d = (R0[k] - ref[k]) / sc; if (!best || Math.abs(d) > Math.abs(best.d)) best = { d, pole: d > 0 ? r : l }; }
    return best;
  };
  const say = [];
  if (B && usual) {
    const d = lean(B, usual);
    say.push(Math.abs(d.d) >= 0.45 ? `<b>${o.name}</b>本局比平时更偏<b>${d.pole}</b>。` : `<b>${o.name}</b>发挥如常，是它一贯的「${o.tag}」路子。`);
  } else if (B) { const d = lean(B, STYLE_BASE.wuming); if (Math.abs(d.d) >= 0.45) say.push(`<b>${nameB}</b>这局偏<b>${d.pole}</b>。`); }
  if (A) {
    const d = lean(A, STYLE_BASE.wuming);
    if (Math.abs(d.d) >= 0.45) say.push(`<b>${nameA}</b>这局偏<b>${d.pole}</b>。`);
    if (!PVP() && A.n >= 6) {                     // 你的棋风最像哪位对手
      let near = null;
      for (const oo of OPPONENTS) { const bb = STYLE_BASE[oo.id]; let dist = 0; for (const [k, , , sc] of STYLE_AX) dist += ((A[k] - bb[k]) / sc) ** 2; if (!near || dist < near.d) near = { d: dist, o: oo }; }
      say.push(`你的下法最像<b>${near.o.name}</b>（${near.o.tag}）。`);
    }
  }
  v.sum = say.join('');
  return v;
}

/* ---- 复盘条 ---- */
export function reviewView() {
  if (S.review < 0) return null;
  const idx = S.review, n = S.moves.length;
  const v = { pos: `${idx} / ${n}`, atStart: idx === 0, atEnd: idx >= n, noResume: idx >= n && S.over, info: '' };
  if (idx >= n) { v.info = '已到最后一手。'; return v; }
  const mv = S.moves[idx], c = idx % 2 === 0 ? 1 : 2;
  const d = moveDeltas()[idx], tag = blunderTag(d);
  const wrBefore = S.wr[idx], wrAfter = S.wr[idx + 1];
  const side = pc => (c === 1 ? pc : 100 - pc);
  let txt = `第 <b>${idx + 1}</b> 手 · ${colorName(c)}棋 ${ptag(mv)}`;
  if (wrBefore !== undefined && wrAfter !== undefined) txt += ` · 胜率 <b>${Math.round(side(wrBefore))}%</b> → <b>${Math.round(side(wrAfter))}%</b>`;
  if (tag) txt += ` <span class="bad">${tag} ${d <= -25 ? '败着' : '疑问手'}</span>`;
  const sg = S.sugg[idx];
  if (sg !== undefined && sg !== mv) txt += `　推荐 ${ptag(sg)}`;
  else if (sg === mv) txt += '　和推荐一致';
  else txt += '　<span style="opacity:.6">电脑分析中…</span>';
  v.info = txt;
  return v;
}
