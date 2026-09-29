/* 定式页要显示的东西：从 BK（book-page.js）算出来，给 views/DingshiView.vue 和 components/book/ 下的组件用。
   只读数据，不改数据，也不碰 DOM。 */
import { BK, bkKey, bkState, gDepth, orderedKids } from './book-page.js';
import { bookState, isBad, isBook, moveName, moverWR, opLabel, opTag, short, treeOf } from './tree.js';
import { OPENINGS, OP_EV, OP_KIND } from './openings.js';
import { coord } from '../ui/sound.js';
import { KIND_CN } from '../game/play.js';
import { cName } from '../puzzles/puzzles.js';

const wrTxt = w => (w == null ? '' : `胜率 ${Math.round(w)}%`);

// 顶部（宽屏是左栏）的开局列表
export function stripView() {
  const cur = BK.op && BK.op.id;
  return ['D', 'I'].map(k => ({
    k, name: OP_KIND[k],
    ops: OPENINGS.filter(o => o.k === k).map(o => ({ id: o.id, name: o.name, on: o.id === cur, ev: OP_EV[o.ev][1], title: `${opTag(o)} · 理论上${OP_EV[o.ev][0]}` })),
  }));
}

// 棋盘上的编号圈：推荐下法（定式 / AI 库），出谱后是引擎候选
function boardMarks(st, res, kids) {
  const shown = st.win ? [] : BK.all ? kids : kids.slice(0, 3);   // 只标前三手，数字是推荐顺序
  const marks = shown.map((k, j) => ({
    i: k.i, x: (k.i % 15) + 1, y: ((k.i / 15) | 0) + 1, no: j + 1, first: j === 0,
    cls: 'mk' + (isBook(k) ? ' bk' : ' ai') + (j === 0 ? ' first' : '') + (isBad(k) ? ' weak' : ''),
    title: `${coord(k.i)}${isBook(k) ? ' · 定式' : ' · 开局库'}${k.n.t ? '：' + short(k.n.t) : ''}`,
  }));
  const cands = !kids.length && res && res.cands && !st.win
    ? res.cands.filter(c => !BK.line.includes(c.m)).map((cd, k) => ({ i: cd.m, x: (cd.m % 15) + 1, y: ((cd.m / 15) | 0) + 1, no: k + 1, title: `电脑推荐：${coord(cd.m)}` }))
    : [];
  return { marks, cands };
}

// 长篇讲解：短的直接显示，长的折叠
const longView = t => (t ? { short: t.length <= 40, lines: String(t).split('\n') } : null);

// 翻谱时的右栏
export function bookView() {
  const o = BK.op, st = bkState(), n = BK.line.length;
  const bs = bookState(BK.line), inBook = bs && bs.inBook, kids = inBook ? orderedKids(bs) : [];
  const res = !kids.length ? BK.cache.get(bkKey(BK.line)) : null;
  const side = n % 2 === 0 ? '黑' : '白', ev = OP_EV[o.ev], J = treeOf(o.id);
  const left = kids.length && isBook(kids[0]) && !isBad(kids[0]) ? gDepth(kids[0].n) : 0;
  const v = {
    n, side, win: st.win, busy: BK.job, label: opLabel(o), tag: opTag(o), ev: ev[1], evText: `理论上${ev[0]}`,
    board: boardMarks(st, res, kids),
    // 棋盘下的手顺：走过的可以点回去，退回去的（灰色）可以点着再走回来
    past: BK.line.slice(3).map((m, j) => ({ to: j + 4, c: coord(m), cls: (BK.src[j + 3] || '') + (j + 4 === n ? ' cur' : '') })),
    fut: BK.fwd.slice().reverse().map((m, j) => ({ k: j + 1, no: n + j + 1, c: coord(m) })),
    nextOk: !st.win && !!(BK.fwd.length || kids.length),
    cur: null, intro: null, next: null,
  };
  if (n > 3 && inBook && bs.node) {
    const nd = bs.node;
    v.cur = { name: moveName(n - 1, BK.line[n - 1]), book: !!nd.b, t: nd.t || '', r: nd.r || '', w: nd.w != null ? `电脑评估：黑 ${Math.round(nd.w)}% · 白 ${Math.round(100 - nd.w)}%` : '', long: longView(nd.l) };
  } else if (n === 3) v.intro = { v: J.v ? J.v + '。' : '', long: longView(J.l) };
  if (st.win) v.next = { kind: 'win', text: `${st.win === 1 ? '黑' : '白'}棋连成五子。` };
  else if (kids.length) {
    v.next = {
      kind: 'kids', head: `第 ${n + 1} 手 · ${side}棋`, left: left ? `主线还有 ${left} 手` : '', more: kids.length - 3, all: BK.all,
      rows: (BK.all ? kids : kids.slice(0, 3)).map((k, j) => ({
        i: k.i, no: j + 1, c: coord(k.i), book: isBook(k), main: j === 0, cls: (isBad(k) ? 'weak' : '') + (j === 0 ? ' first' : ''),
        t: short(k.n.t || '') + (k.n.r ? ` · ${k.n.r}` : ''), w: wrTxt(moverWR(k)),
      })),
    };
  } else {
    const pb = res && res.p !== null ? Math.round(res.p) : null, cs = res && res.cands ? res.cands.filter(c => !BK.line.includes(c.m)) : [];
    v.next = {
      kind: 'engine', off: n > 3 ? (inBook ? '定式到这里结束' : '已经出谱') + '，下面是电脑推荐的下法。' : '', wait: !res,
      form: pb === null ? '' : `形势 黑 ${pb}% · 白 ${100 - pb}%`,
      cands: cs.map((c, k) => ({ i: c.m, no: k + 1, c: coord(c.m), kind: c.kind && KIND_CN[c.kind] ? KIND_CN[c.kind] : '' })),
    };
  }
  v.analyse = !kids.length && !res && !st.win;
  return v;
}

// 练习时的右栏
export function practiceView() {
  const o = BK.op, P = BK.pr, st = bkState(), n = BK.line.length, ev = OP_EV[o.ev];
  const turn = n % 2 === 0 ? 1 : 2, mine = turn === P.human && !P.busy && !P.decide && !P.over && !st.win;
  return {
    n, label: opLabel(o), tag: opTag(o), ev: ev[1], evText: `理论上${ev[0]}`, side: cName(P.human), ok: P.ok, off: P.off,
    board: boardMarks(st, P.cands ? { cands: P.cands } : null, P.show || []),
    state: P.busy ? '电脑思考中' : mine ? '轮到你' : P.over ? '已结束' : P.decide ? '等你决定' : '',
    canBack: n > P.base.length && !P.busy, mine, busy: !!P.busy, decide: P.decide, msg: P.msg,
    past: BK.line.slice(3).map((m, j) => ({ no: j + 4, c: coord(m), cls: (BK.src[j + 3] || '') + (j + 4 === n ? ' cur' : '') + (j + 3 < P.base.length ? ' pre' : '') })),
  };
}
