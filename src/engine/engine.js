/* ================= 引擎 =================
   棋盘表示、连珠禁手、点位估值、VCT/VCF、搜索入口、形势分析。纯计算、不碰页面，主线程和后台线程（worker.js）共用。 */

export const colorName = c => (c === 1 ? '黑' : '白');
export let N = 15; export let NN, CENTER;
export const DX = [1, 0, 1, 1], DY = [0, 1, 1, -1];
export const LETTERS = 'ABCDEFGHIJKLMNO';
export let b;          // 0 空 1 黑 2 白
let near;      // 周围两格内的棋子数
// 棋规：renju 连珠（黑方恰好五子胜、有禁手；白方长连亦胜）；std 标准五子棋（双方恰好五子胜、长连不计、无禁手）；free 无禁手（五子及以上即胜）
export let RULE = 'renju';
export const exactFor = c => RULE === 'std' || (RULE === 'renju' && c === 1);   // 是否只认恰好五子
const forbFor = c => RULE === 'renju' && c === 1;                         // 是否有禁手
// Pro / Long Pro 开局：黑方第 2 子（盘上已有两子时）须与天元相距至少 AWAY 路（0 表示不限）
export let AWAY = 0;
export function setAway(n) { AWAY = n | 0; }
export const awayOk = i => !AWAY || stoneCount() !== 2 || Math.max(Math.abs(i % N - 7), Math.abs(((i / N) | 0) - 7)) >= AWAY;
const RULE_SALT = { renju: [0x5bd1e995, 0x68e31da4], free: [0x1b873593, 0x3c6ef372], std: [0x2545f491, 0x4f1bbcdd] };

// 每个点在四个方向上 -4..4 的邻格索引
let OFF;
const NEAR2 = [];
// Zobrist 哈希与置换表
let ZOB;
let ZOB_SIDE;
let hashKey = 0;
let TT_BITS = 20; let TT_SIZE, TT_MASK;
let ttKey, ttVal, ttInfo, ttMove;
let ttHits = 0, ttStores = 0;
export function ttClear() { ttInfo.fill(0); ttKey.fill(0); ttMove.fill(-1); KILL.length = 0; vfKey.fill(0); vfDep.fill(0); vtKey.fill(0); vtDep.fill(0); }

export function place(i, c) { b[i] = c; hashKey ^= ZOB[i * 2 + c - 1]; const a = NEAR2[i]; for (let k = 0; k < a.length; k++) near[a[k]]++; bumpKeys(i, c, 1); }
export function unplace(i) { const c = b[i]; hashKey ^= ZOB[i * 2 + c - 1]; b[i] = 0; const a = NEAR2[i]; for (let k = 0; k < a.length; k++) near[a[k]]--; bumpKeys(i, c, -1); }
// 棋形缓存：每个点、每个方向、黑白各自「假如下在这里」的棋形。KEY 是那一路 8 个邻格的三进制编码（0 空、1 己方、2 对方或出界），
// SH 是查表得到的棋形。落子 / 提子只改那一手四条线上 32 个邻点的编码（加减一个权重），再各查一次表，
// 搜索里的点位评估直接读 SH，不用每个节点把整盘重新扫一遍
let SH, KEY;
const WPOS = [2187, 729, 243, 81, 0, 27, 9, 3, 1];   // 邻格在对方窗口里的位置 → 三进制权重
function bumpKeys(i, c, sgn) {
  const t1 = exactFor(1) ? T_EXACT : T_FREE, t2 = exactFor(2) ? T_EXACT : T_FREE;
  const v1 = c === 1 ? 1 : 2, v2 = c === 2 ? 1 : 2;   // 对黑来说这颗子是己方还是对方；对白同理
  for (let d = 0; d < 4; d++) {
    const base = (d * NN + i) * 9, o1 = d * NN, o2 = (4 + d) * NN;
    for (let k = 0; k < 9; k++) {
      if (k === 4) continue;
      const j = OFF[base + k];
      if (j < 0) continue;
      const w = WPOS[k] * sgn;
      const k1 = KEY[o1 + j] += v1 * w, k2 = KEY[o2 + j] += v2 * w;
      SH[o1 + j] = t1[k1]; SH[o2 + j] = t2[k2];
    }
  }
}
function rebuildShapes() {
  const t1 = exactFor(1) ? T_EXACT : T_FREE, t2 = exactFor(2) ? T_EXACT : T_FREE;
  for (let d = 0; d < 4; d++) for (let j = 0; j < NN; j++) {
    const base = (d * NN + j) * 9;
    let k1 = 0, k2 = 0;
    for (let q = 0; q < 8; q++) {
      const t = OFF[base + POS[q]], v = t < 0 ? 3 : b[t];
      k1 += (v === 0 ? 0 : v === 1 ? 1 : 2) * P3[q]; k2 += (v === 0 ? 0 : v === 2 ? 1 : 2) * P3[q];
    }
    KEY[d * NN + j] = k1; KEY[(4 + d) * NN + j] = k2; SH[d * NN + j] = t1[k1]; SH[(4 + d) * NN + j] = t2[k2];
  }
}

// 棋型编码：0 无 1 眠二 2 活二 3 眠三 4 活三 5 冲四 6 活四 7 成五 8 长连
const POS = [0, 1, 2, 3, 5, 6, 7, 8], P3 = [1, 3, 9, 27, 81, 243, 729, 2187];
function classify(s, exact) {
  let l = 4, r = 4;
  while (l > 0 && s[l - 1] === 'x') l--;
  while (r < 8 && s[r + 1] === 'x') r++;
  const run = r - l + 1;
  if (run >= 5) return (run === 5 || !exact) ? 7 : 8;
  let l3 = false, l2 = false, r4 = false, s3 = false, s2 = false;
  // 只认恰好五子时：五格窗口外紧挨着的是己方子，补上就成了长连，这个窗口成不了五
  const xAt = q => q >= 0 && q < 9 && s[q] === 'x';
  const ok5 = st => !exact || (!xAt(st - 1) && !xAt(st + 5));
  for (let st = 0; st <= 3; st++) {
    if (s[st] !== '_' || s[st + 5] !== '_') continue;
    let cx = 0, bad = false;
    for (let q = st + 1; q <= st + 4; q++) { if (s[q] === 'o') { bad = true; break; } if (s[q] === 'x') cx++; }
    if (bad) continue;
    if (cx === 4) { const a = ok5(st), z = ok5(st + 1); if (a && z) return 6; if (a || z) r4 = true; continue; }   // 两头都能恰好成五才是活四
    if (cx === 3) l3 = true; else if (cx === 2) l2 = true;
  }
  for (let st = 0; st <= 4; st++) {
    let cx = 0, bad = false;
    for (let q = st; q < st + 5; q++) { if (s[q] === 'o') { bad = true; break; } if (s[q] === 'x') cx++; }
    if (bad) continue;
    if (cx === 4) { if (ok5(st)) r4 = true; } else if (cx === 3) s3 = true; else if (cx === 2) s2 = true;
  }
  if (r4) return 5; if (l3) return 4; if (s3) return 3; if (l2) return 2; if (s2) return 1; return 0;
}
function buildTable(exact) {
  const t = new Int8Array(6561), s = new Array(9);
  for (let key = 0; key < 6561; key++) {
    let k = key;
    for (let q = 0; q < 8; q++) { const v = k % 3; k = (k / 3) | 0; s[POS[q]] = v === 0 ? '_' : v === 1 ? 'x' : 'o'; }
    s[4] = 'x';
    t[key] = classify(s, exact);
  }
  return t;
}
let T_FREE, T_EXACT;

function shapeAt(i, c, d, tbl) {
  const base = (d * NN + i) * 9;
  let key = 0;
  for (let q = 0; q < 8; q++) {
    const j = OFF[base + POS[q]];
    const v = j < 0 ? 2 : (b[j] === 0 ? 0 : (b[j] === c ? 1 : 2));
    key += v * P3[q];
  }
  return tbl[key];
}

export function runLen(i, d, c) { // 把 i 视为 c，沿方向 d 的连子数
  const base = (d * NN + i) * 9;
  let n = 1;
  for (let k = 1; k <= 4; k++) { const j = OFF[base + 4 + k]; if (j < 0 || b[j] !== c) break; n++; }
  for (let k = 1; k <= 4; k++) { const j = OFF[base + 4 - k]; if (j < 0 || b[j] !== c) break; n++; }
  return n;
}
export function isFiveMove(i, c) {
  const ex = exactFor(c);
  for (let d = 0; d < 4; d++) { const n = runLen(i, d, c); if (ex ? n === 5 : n >= 5) return true; }
  return false;
}

/* ---- 连珠禁手判定（黑） ---- */
export const inb = (x, y) => x >= 0 && x < N && y >= 0 && y < N;
export function foursInDir(i, d) {
  const base = (d * NN + i) * 9, pts = [];
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const j = OFF[base + 4 + k];
    if (j < 0 || b[j] !== 0) continue;
    b[j] = 1;
    let ok = false;
    if (runLen(j, d, 1) === 5) {
      ok = true;
      const lo = Math.min(k, 0), hi = Math.max(k, 0);
      for (let t = lo + 1; t < hi; t++) { const q = OFF[base + 4 + t]; if (q < 0 || b[q] !== 1) { ok = false; break; } }
    }
    b[j] = 0;
    if (ok) pts.push(k);
  }
  if (!pts.length) return 0;
  if (pts.length === 1) return 1;
  if (pts.length === 2 && Math.abs(pts[0] - pts[1]) === 5) return 1;
  return 2;
}
function straightFour(j, d, iOff) { // b[j]=1 已放；判断 j 所在是否为活四且包含 i
  const x = j % N, y = (j / N) | 0, dx = DX[d], dy = DY[d];
  let lo = 0, hi = 0;
  while (true) { const xx = x + dx * (lo - 1), yy = y + dy * (lo - 1); if (!inb(xx, yy) || b[yy * N + xx] !== 1) break; lo--; }
  while (true) { const xx = x + dx * (hi + 1), yy = y + dy * (hi + 1); if (!inb(xx, yy) || b[yy * N + xx] !== 1) break; hi++; }
  if (hi - lo + 1 !== 4 || iOff < lo || iOff > hi) return false;
  for (const [e, f] of [[lo - 1, lo - 2], [hi + 1, hi + 2]]) {
    const ex = x + dx * e, ey = y + dy * e;
    if (!inb(ex, ey) || b[ey * N + ex] !== 0) return false;
    const fx = x + dx * f, fy = y + dy * f;
    if (inb(fx, fy) && b[fy * N + fx] === 1) return false;
  }
  return true;
}
export function liveThreeInDir(i, d, depth) {
  const base = (d * NN + i) * 9;
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const j = OFF[base + 4 + k];
    if (j < 0 || b[j] !== 0) continue;
    b[j] = 1;
    const ok = straightFour(j, d, -k);
    b[j] = 0;
    if (ok && (depth >= 2 || !isForbidden(j, depth + 1))) return true;
  }
  return false;
}
export function isForbidden(i, depth = 0) {
  if (b[i] !== 0) return false;
  b[i] = 1;
  let five = false, over = false, res = false;
  for (let d = 0; d < 4; d++) { const n = runLen(i, d, 1); if (n === 5) five = true; else if (n > 5) over = true; }
  if (five) res = false;
  else if (over) res = true;
  else {
    let fours = 0, threes = 0;
    for (let d = 0; d < 4 && fours < 2; d++) {
      const f = foursInDir(i, d);
      fours += f;
      if (f === 0 && threes < 2 && liveThreeInDir(i, d, depth)) threes++;
    }
    res = fours >= 2 || threes >= 2;
  }
  b[i] = 0;
  return res;
}

/* ---- 点位评估 ---- */
const VAL = [0, 30, 200, 180, 2000, 2200, 0, 0, 0];
// 对手风格：只影响“有得选”时的偏好（点位打分、候选排序、同分取舍），不碰战术判断
const STYLE0 = { atk: 1, def: 1, diag: 1, line: 1, center: 0, build: 0, guard: 0, diagB: 0, near: 0, salt: 0, firstReply: null };
let LASTMV = -1;   // 对方上一手，贴身型对手用
// 根节点的性格加分：只在分值接近的几手之间起作用，杀棋与必挡不受影响
function styleBonus(m, c) {
  const st = STYLE;
  if (!st.center && !st.build && !st.guard && !st.diagB && !st.near) return 0;
  let bonus = st.center * ring(m);
  if (st.near && LASTMV >= 0) {                                                // 贴着对方上一手
    const dd = Math.max(Math.abs(m % N - LASTMV % N), Math.abs(((m / N) | 0) - ((LASTMV / N) | 0)));
    bonus += st.near * (dd <= 1 ? 320 : dd === 2 ? 140 : 0);
  }
  if (st.build) bonus += st.build * Math.min(evalPoint(m, c), 5000);          // 搭自己的棋型
  if (st.guard) bonus += st.guard * Math.min(evalPoint(m, 3 - c), 5000);      // 拆对方的棋型
  if (st.diagB) {                                                               // 斜着长
    const tbl = exactFor(c) ? T_EXACT : T_FREE;
    for (let d = 0; d < 4; d++) { const sh = shapeAt(m, c, d, tbl); if (sh >= 1 && sh <= 6) bonus += (d >= 2 ? 1 : -1) * st.diagB * VAL[sh]; }
  }
  return bonus;
}
let STYLE = STYLE0;
export const ring = i => 7 - Math.max(Math.abs(i % N - 7), Math.abs(((i / N) | 0) - 7));   // 0=边缘 … 7=天元
let LV = 0, H4 = false; // LV: -1 禁手 0 普通 1 活三 2 冲四 3 四三/双三 4 活四/双四 5 成五
// 假如 c 下在 i：有几个点能恰好（或至少，按棋规）连成五
function fiveCount(i, c) {
  if (b[i] !== 0) return 0;
  b[i] = c; const seen = [];
  try {
    for (let d = 0; d < 4; d++) {
      const base = (d * NN + i) * 9;
      for (let k = -4; k <= 4; k++) {
        if (!k) continue;
        const j = OFF[base + 4 + k];
        if (j < 0 || b[j] !== 0 || seen.includes(j)) continue;
        b[j] = c; const n = runLen(j, d, c); b[j] = 0;
        if (exactFor(c) ? n === 5 : n >= 5) seen.push(j);
      }
    }
  } finally { b[i] = 0; }
  return seen.length;
}
export function evalPoint(i, c) {
  let c4 = 0, c3 = 0, sum = 0, five = false, over = false, l4 = false;
  const so = (c - 1) * 4 * NN + i;
  for (let d = 0; d < 4; d++) {
    const s = SH[so + d * NN];
    if (s === 7) five = true;
    else if (s === 8) over = true;
    else if (s === 6) { l4 = true; c4++; }
    else if (s === 5) c4++;
    else if (s === 4) c3++;
    sum += VAL[s] * (d >= 2 ? STYLE.diag : STYLE.line);
  }
  H4 = c4 > 0;
  if (five) { LV = 5; return 1000000; }
  if (forbFor(c)) {
    if (over || ((c4 >= 2 || c3 >= 2) && isForbidden(i, 0))) { LV = -1; H4 = false; return 0; }
  }
  // 只认恰好五子时，棋形表只看得到前后四格：更远处的己方子会让「成五」变成长连。活四、双四这种少见情形再按真实棋盘数一遍成五点
  if ((l4 || c4 >= 2) && exactFor(c) && fiveCount(i, c) < 2) { if (l4) sum += VAL[5]; l4 = false; c4 = Math.min(c4, 1); }
  if (l4 || c4 >= 2) { LV = 4; return 100000; }
  if (c4 && c3) { LV = 3; return 30000; }
  if (c3 >= 2) { LV = 3; return 15000; }
  if (c4) { LV = 2; return sum; }
  if (c3) { LV = 1; return sum; }
  LV = 0; return sum;
}

export function cands() { const a = []; for (let i = 0; i < NN; i++) if (b[i] === 0 && near[i] > 0) a.push(i); return a; }

// 静态评估的特征：己方/对方各级威胁点的个数，外加零散棋型的分数和
// [活四或双四, 四三或双三, 冲四, 活三, 零散分/1000]
const EVW_MY = [11855, 6890, 2376, 1103, 355];
const EVW_OP = [9024, 6810, 1198, 501, 57];
let FEAT_MY = [0, 0, 0, 0, 0], FEAT_OP = [0, 0, 0, 0, 0];
function analyze(c) {
  const opp = 3 - c, list = cands();
  const R = { myFive: -1, oppFive: [], myWin4: -1, oppThreat: false, items: [], ev: 0 };
  const fm = [0, 0, 0, 0, 0], fo = [0, 0, 0, 0, 0];
  for (let n = 0; n < list.length; n++) {
    const i = list[n];
    const ms = evalPoint(i, c), ml = LV, mh = H4;
    if (ml === 5) { R.myFive = i; return R; }
    const os = evalPoint(i, opp), ol = LV;
    if (ol === 5) R.oppFive.push(i);
    if (ml === 4 && R.myWin4 < 0) R.myWin4 = i;
    if (ol >= 3) R.oppThreat = true;
    R.items.push({ i, ms, ml, mh, os, ol });
    if (ml >= 1) fm[4 - Math.min(ml, 4)]++; else fm[4] += ms / 1000;
    if (ol >= 1) fo[4 - Math.min(ol, 4)]++; else fo[4] += os / 1000;
  }
  let ev = 0;
  for (let k = 0; k < 5; k++) ev += EVW_MY[k] * fm[k] * STYLE.atk - EVW_OP[k] * fo[k] * STYLE.def;
  R.ev = ev;
  FEAT_MY = fm; FEAT_OP = fo;
  return R;
}
function pickMoves(A, K) {
  const items = A.items, onlyDef = A.oppThreat && items.some(o => o.ml >= 0 && (o.ol >= 2 || o.mh));
  const atk = STYLE.atk, def = 0.9 * STYLE.def, cen = STYLE.center * 0.2;
  // 选前 K 个：分数只算一次，插进一个按分数排好的小数组（K 不大，比整体排序快得多）
  const top = [], sc = [];
  for (let n = 0; n < items.length; n++) {
    const o = items[n];
    if (o.ml < 0 || (onlyDef && !(o.ol >= 2 || o.mh))) continue;
    const v = o.ms * atk + o.os * def + (cen ? cen * ring(o.i) : 0);
    if (top.length === K && v <= sc[K - 1]) continue;
    let p = top.length < K ? top.length : K - 1;
    while (p > 0 && sc[p - 1] < v) { if (p < K) { top[p] = top[p - 1]; sc[p] = sc[p - 1]; } p--; }
    top[p] = o.i; sc[p] = v;
    if (top.length > K) { top.length = K; sc.length = K; }
  }
  return top;
}

const WIN = 1e8, TIMEOUT = { t: 1 };
export let nodes = 0;
let lastDepth = 0;   // 上一次 think() 迭代加深完成到第几层（测速脚本读它）
let deadline = 0, BRANCH = 10;
const KILL = [];   // 每一层最近引起剪枝的两手
function tick() { if (((++nodes) & 255) === 0 && performance.now() > deadline) throw TIMEOUT; }

function negamax(c, depth, alpha, beta, ply) {
  tick();
  const tkey = (hashKey ^ (c === 2 ? ZOB_SIDE : 0) ^ STYLE.salt) | 0;
  const tidx = (tkey >>> 0) & TT_MASK;
  let ttBest = -1;
  if (ttKey[tidx] === tkey && ttInfo[tidx]) {
    const info = ttInfo[tidx], td = (info >> 2) - 1, fl = info & 3, tv = ttVal[tidx];
    ttBest = ttMove[tidx];
    if (td >= depth && Math.abs(tv) < WIN - 1000) {
      if (fl === 0) { ttHits++; return tv; }
      if (fl === 1 && tv >= beta) { ttHits++; return tv; }
      if (fl === 2 && tv <= alpha) { ttHits++; return tv; }
    }
  }
  const alpha0 = alpha;
  const A = analyze(c);
  if (A.myFive >= 0) return WIN - ply;
  if (A.oppFive.length >= 2) return -(WIN - ply - 1);
  let moves, forced = false;
  if (A.oppFive.length === 1) {
    const f = A.oppFive[0], it = A.items.find(o => o.i === f);
    if (!it || it.ml < 0) return -(WIN - ply - 1);
    moves = [f]; forced = true;
  } else {
    if (A.myWin4 >= 0) return WIN - ply - 2;
    if (depth <= 0) return A.ev;
    moves = pickMoves(A, BRANCH);
    if (!moves.length) return 0;
  }
  // 着法顺序：置换表里的最佳手，其次这一层上次剪枝用的两手（killer），其余按点位分
  if (moves.length > 1) {
    const K = KILL[ply] || (KILL[ply] = [-1, -1]);
    for (const m of [K[1], K[0], ttBest]) {
      if (m < 0 || b[m] !== 0) continue;
      const at = moves.indexOf(m);
      if (at > 0) { moves.splice(at, 1); moves.unshift(m); }
    }
  }
  let best = -Infinity, bestMove = -1;
  for (let n = 0; n < moves.length; n++) {
    const m = moves[n], nd = forced ? depth : depth - 1;
    place(m, c);
    let v;
    try {
      if (n === 0) v = -negamax(3 - c, nd, -beta, -alpha, ply + 1);
      else {
        // 主变搜索：后面的着法先用零窗口试，排在后面的再少搜一层（LMR）；试出来比当前好才按全窗口重搜
        const r = !forced && n >= 3 && depth >= 3 ? 1 : 0;
        v = -negamax(3 - c, nd - r, -alpha - 1, -alpha, ply + 1);
        if (v > alpha && r) v = -negamax(3 - c, nd, -alpha - 1, -alpha, ply + 1);
        if (v > alpha && v < beta) v = -negamax(3 - c, nd, -beta, -alpha, ply + 1);
      }
    }
    finally { unplace(m); }
    if (v > best) { best = v; bestMove = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) {
      const K = KILL[ply] || (KILL[ply] = [-1, -1]);
      if (K[0] !== m) { K[1] = K[0]; K[0] = m; }
      break;
    }
  }
  if (Math.abs(best) < WIN - 1000) {
    const fl = best <= alpha0 ? 2 : best >= beta ? 1 : 0;
    ttKey[tidx] = tkey; ttVal[tidx] = best | 0; ttInfo[tidx] = ((depth + 1) << 2) | fl; ttMove[tidx] = bestMove;
    ttStores++;
  }
  return best;
}

/* ---- 连续冲四（VCF）---- */
export function fivePointsNear(m, c) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const base = (d * NN + m) * 9;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const j = OFF[base + 4 + k];
      if (j < 0 || b[j] !== 0 || out.includes(j)) continue;
      const n = runLen(j, d, c);
      if (exactFor(c) ? n === 5 : n >= 5) out.push(j);
    }
  }
  return out;
}
// 连续冲四的失败表：这个局面（轮到 c 冲）在 depth 步以内冲不出来，记下来，换个顺序走到同一局面就不再算
const VF_BITS = 18, VF_MASK = (1 << VF_BITS) - 1, vfKey = new Int32Array(1 << VF_BITS), vfDep = new Int8Array(1 << VF_BITS);
function vcfMove(c, depth) {
  tick();
  const vk = (hashKey ^ (c === 2 ? ZOB_SIDE : 0) ^ RULE_SALT[RULE][0]) | 0, vi = (vk >>> 0) & VF_MASK;
  if (vfKey[vi] === vk && vfDep[vi] >= depth) return -1;
  const r = vcfInner(c, depth);
  if (r < 0 && (vfKey[vi] !== vk || vfDep[vi] < depth)) { vfKey[vi] = vk; vfDep[vi] = depth; }
  return r;
}
function vcfInner(c, depth) {
  const opp = 3 - c, list = cands();
  const fours = [];
  let oppFive = -1, oppN = 0;
  for (const i of list) {
    const s = evalPoint(i, c);
    if (LV === 5) return i;
    if (H4 && LV >= 0) fours.push([i, s]);
    evalPoint(i, opp);
    if (LV === 5) { oppFive = i; oppN++; }
  }
  if (oppN >= 2 || depth <= 0) return -1;
  let moves = oppN === 1 ? fours.filter(f => f[0] === oppFive) : fours;
  moves.sort((p, q) => q[1] - p[1]);
  for (const [m] of moves) {
    place(m, c);
    let win = false;
    try {
      const fp = fivePointsNear(m, c);
      if (fp.length >= 2) win = true;
      else if (fp.length === 1) {
        const dp = fp[0];
        if (forbFor(opp) && isForbidden(dp, 0)) win = true;
        else {
          place(dp, opp);
          try { win = !isFiveMove(dp, opp) && vcfMove(c, depth - 1) >= 0; }
          finally { unplace(dp); }
        }
      }
    } finally { unplace(m); }
    if (win) return m;
  }
  return -1;
}
/* ---- 连续威胁搜索 VCT：进攻方只走冲四或活三，防守方只考虑有限防点 ---- */
// VCT 的失败表，和连续冲四的一样：记下「这个局面 depth 步以内没有连续威胁」
const vtKey = new Int32Array(1 << VF_BITS), vtDep = new Int8Array(1 << VF_BITS);
function vctMove(c, depth) {
  tick();
  const vk = (hashKey ^ (c === 2 ? ZOB_SIDE : 0) ^ RULE_SALT[RULE][1]) | 0, vi = (vk >>> 0) & VF_MASK;
  if (vtKey[vi] === vk && vtDep[vi] >= depth) return -1;
  const r = vctInner(c, depth);
  if (r < 0 && (vtKey[vi] !== vk || vtDep[vi] < depth)) { vtKey[vi] = vk; vtDep[vi] = depth; }
  return r;
}
function vctInner(c, depth) {
  const A = analyze(c);
  if (A.myFive >= 0) return A.myFive;
  if (A.oppFive.length) return -1;           // 轮到自己却要挡棋，不是连续进攻
  if (A.myWin4 >= 0) return A.myWin4;
  const quick = vcfMove(c, 8);
  if (quick >= 0) return quick;
  if (depth <= 0) return -1;
  const atk = A.items.filter(o => o.ml >= 1 && o.ml < 5).sort((p, q) => q.ms - p.ms).slice(0, 8);
  for (const o of atk) {
    const m = o.i;
    place(m, c);
    let win = false;
    try { win = !defenderHolds(3 - c, depth); } finally { unplace(m); }
    if (win) return m;
  }
  return -1;
}
function defenderHolds(d, depth) {
  tick();
  const A = analyze(d);                       // d 为防守方，轮到 d 走
  if (A.myFive >= 0) return true;             // 防守方能先成五
  if (A.oppFive.length >= 2) return false;    // 进攻方双四
  let defs;
  if (A.oppFive.length === 1) {
    const f = A.oppFive[0], it = A.items.find(o => o.i === f);
    if (!it || it.ml < 0) return false;       // 唯一防点是禁手
    defs = [f];
  } else {
    defs = A.items.filter(o => o.ml >= 0 && (o.ol >= 2 || o.ml >= 2))
      .sort((p, q) => (q.os + q.ms) - (p.os + p.ms)).slice(0, 10).map(o => o.i);
    if (!defs.length) return true;            // 没有成形威胁，算防住
  }
  for (const m of defs) {
    place(m, d);
    let survives = false;
    try { survives = vctMove(3 - d, depth - 1) < 0; } finally { unplace(m); }
    if (survives) return true;
  }
  return false;
}
function safeVct(c, depth, ms) {
  const saved = deadline;
  deadline = Math.min(saved, performance.now() + ms);
  let r = -1;
  try { r = vctMove(c, depth); } catch (e) { if (e !== TIMEOUT) throw e; }
  deadline = saved;
  return r;
}
function safeVcf(c, depth, ms) {
  const saved = deadline;
  deadline = Math.min(saved, performance.now() + ms);
  let r = -1;
  try { r = vcfMove(c, depth); } catch (e) { if (e !== TIMEOUT) throw e; }
  deadline = saved;
  return r;
}

/* ---- AI 入口 ---- */
export const CFG = {
  easy:   { easy: true },
  normal: { depth: 4, branch: 8, time: 500, vary: 800, book: 5000 },
  hard:   { depth: 10, branch: 10, time: 1200, vcf: 10, vcfTime: 250, vct: 3, vctTime: 300, defend: 250, vary: 400, book: 3000 },
  master: { depth: 14, branch: 12, time: 2600, vcf: 16, vcfTime: 600, vct: 4, vctTime: 600, defend: 500, vary: 200, book: 2000 },
};
// 对手 = 下棋偏好；难度 = 算力档位。两者自由组合，CFG 的键是 "对手.难度"
export const DIFFS = ['easy', 'normal', 'hard', 'master'];
export const OPPONENTS = [
  { id: 'wuming', name: '守中', mark: '中', tag: '均衡',
    desc: '不偏不倚，攻守随势，哪步好就走哪步。', style: {} },
  { id: 'chong',  name: '惊雷', mark: '雷', tag: '进攻',
    desc: '出手如雷，满盘寻活三、冲四，一有机会就强攻。', style: { atk: 1.2, def: 0.95, build: 1.5, margin: 700, firstReply: 'direct', salt: 0x1a2b3c } },
  { id: 'laogui', name: '磐石', mark: '磐', tag: '防守',
    desc: '稳如磐石，先封住你的每一条路，等你露出破绽再反击。', style: { atk: 0.95, def: 1.15, guard: 1.5, center: 60, margin: 700, salt: 0x2b3c4d } },
  { id: 'xieyue', name: '斜月', mark: '月', tag: '斜线',
    desc: '偏爱斜线，棋形总是斜着生长，最擅长让你看漏对角的威胁。', style: { diag: 1.25, line: 0.9, diagB: 2.2, margin: 700, firstReply: 'diag', salt: 0x3c4d5e } },
  { id: 'yehu',   name: '飞鸿', mark: '鸿', tag: '奇招', varyMul: 3,
    desc: '飞鸿踏雪，不循常路，爱往边角落子，开局变化最多。', style: { center: -360, atk: 1.05, margin: 750, salt: 0x4d5e6f } },
  { id: 'atu',    name: '如影', mark: '影', tag: '贴身',
    desc: '如影随形，你落在哪里，它就贴到哪里，专爱近身缠斗。', style: { near: 2.0, margin: 700, firstReply: 'direct', salt: 0x6f7081 } },
];
// 棋盘的八种对称变换中，保持当前局面不变的那些
const SYM = [[1, 0, 0, 1], [-1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, -1], [0, 1, 1, 0], [0, -1, 1, 0], [0, 1, -1, 0], [0, -1, -1, 0]];
function symMap(i, t) {
  const dx = i % N - 7, dy = ((i / N) | 0) - 7;
  const nx = t[0] * dx + t[1] * dy, ny = t[2] * dx + t[3] * dy;
  return (ny + 7) * N + (nx + 7);
}
function openingPool() {
  const occ = [];
  for (let i = 0; i < NN; i++) if (b[i]) occ.push(i);
  const stab = SYM.filter(t => occ.every(i => b[symMap(i, t)] === b[i]));
  const seen = new Set(), out = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const i = (7 + dy) * N + 7 + dx;
    if (b[i] !== 0) continue;
    let key = i;
    for (const t of stab) key = Math.min(key, symMap(i, t));
    if (seen.has(key)) continue;
    seen.add(key); out.push(i);
  }
  return out;
}
// 开局规则里摆打点要「互不对称」：当前局面在哪些翻转旋转下不变，i 在这些变换下的最小编号；两个点编号相同就是对称的
export function symKey(i) {
  const occ = [];
  for (let j = 0; j < NN; j++) if (b[j]) occ.push(j);
  let key = i;
  for (const t of SYM) if (occ.every(j => b[symMap(j, t)] === b[j])) key = Math.min(key, symMap(i, t));
  return key;
}
function stoneCount() { let n = 0; for (let i = 0; i < NN; i++) if (b[i]) n++; return n; }

export function think(c, cfg) {
  if (cfg && cfg.advice) return bestAdvice(c);
  const prev = STYLE;
  STYLE = cfg && cfg.style ? Object.assign({}, STYLE0, cfg.style) : STYLE0;
  LASTMV = cfg && typeof cfg.last === 'number' ? cfg.last : -1;
  try { return thinkInner(c, cfg); } finally { STYLE = prev; }
}
function thinkInner(c, cfg) {
  if (stoneCount() === 0) return CENTER;
  if (AWAY && stoneCount() === 2) return awayMove(c, cfg);
  nodes = 0;
  deadline = performance.now() + (cfg.time || 400) + (cfg.vcfTime || 0) + (cfg.defend || 0);
  const A = analyze(c);
  if (A.myFive >= 0) return A.myFive;
  const legal = A.items.filter(o => o.ml >= 0);
  if (!legal.length) return A.items.length ? A.items[0].i : cands()[0];

  if (cfg.easy) {
    if (A.oppFive.length && Math.random() < 0.8) { const f = A.oppFive.find(i => legal.some(o => o.i === i)); if (f !== undefined) return f; }
    if (A.myWin4 >= 0 && Math.random() < 0.6) return A.myWin4;
    const pool = legal.map(o => [o.i, o.ms * STYLE.atk + o.os * 0.45 * STYLE.def + styleBonus(o.i, c) * 0.5 + Math.random() * 400]).sort((p, q) => q[1] - p[1]).slice(0, 5);
    return pool[(Math.random() * Math.min(pool.length, 3)) | 0][0];
  }

  if (A.oppFive.length) {
    const f = A.oppFive.find(i => legal.some(o => o.i === i));
    return f !== undefined ? f : legal[0].i;
  }
  if (A.myWin4 >= 0) return A.myWin4;

  // 开局库：第三手（黑第二子）在对称意义下互不等价的落点，构成经典开局的候选集
  if (cfg.vary && stoneCount() === 2) {
    const pool = openingPool();
    if (pool.length > 1) {
      BRANCH = cfg.branch;
      const exact = [];
      deadline = performance.now() + 700;
      try {
        for (const m of pool) {
          if (b[m] !== 0) continue;
          if (forbFor(c) && isForbidden(m, 0)) continue;
          place(m, c);
          let v;
          try { v = -negamax(3 - c, Math.min(cfg.depth, 6) - 1, -Infinity, Infinity, 1); } finally { unplace(m); }
          exact.push([m, v]);
        }
      } catch (e) { if (e !== TIMEOUT) throw e; }
      deadline = performance.now() + (cfg.time || 400) + (cfg.vcfTime || 0) + (cfg.defend || 0);
      if (exact.length > 1) {
        exact.sort((p, q) => q[1] - p[1]);
        const top = exact[0][1];
        if (Math.abs(top) < WIN - 100) {
          const sel = exact.filter(x => x[1] >= top - (cfg.book || cfg.vary * 2)).slice(0, 8);
          return sel[(Math.random() * sel.length) | 0][0];
        }
      }
    }
  }

  // 黑棋首手在天元时，白棋八个相邻点按棋盘对称性完全等价，可以放心随机
  if (cfg.vary && stoneCount() === 1 && b[CENTER] === 1) {
    const pool = STYLE.firstReply === 'diag' ? [-16, -14, 14, 16] : STYLE.firstReply === 'direct' ? [-15, -1, 1, 15] : [-16, -15, -14, -1, 1, 14, 15, 16];
    const opts = pool.map(k => CENTER + k);
    return opts[(Math.random() * opts.length) | 0];
  }

  // 开局阶段在“真实分值接近”的着法里随机选，保证每局棋路不同（此时局面简单，全窗口重搜很便宜）
  if (cfg.vary && stoneCount() <= 4) {
    BRANCH = cfg.branch;
    const cand = pickMoves(A, 12), d = Math.min(cfg.depth, 6), exact = [];
    deadline = performance.now() + 600;
    try {
      for (const m of cand) {
        place(m, c);
        let v;
        try { v = -negamax(3 - c, d - 1, -Infinity, Infinity, 1); } finally { unplace(m); }
        exact.push([m, v]);
      }
    } catch (e) { if (e !== TIMEOUT) throw e; }
    deadline = performance.now() + (cfg.time || 400) + (cfg.vcfTime || 0) + (cfg.defend || 0);
    if (exact.length > 1) {
      exact.sort((p, q) => q[1] - p[1]);
      const top = exact[0][1];
      if (Math.abs(top) < WIN - 100) {
        const pool = exact.filter(x => x[1] >= top - cfg.vary).slice(0, 6);
        return pool[(Math.random() * pool.length) | 0][0];
      }
    }
  }

  if (cfg.vcf) { const m = safeVcf(c, cfg.vcf, cfg.vcfTime); if (m >= 0) return m; }
  if (cfg.vct) { const m = safeVct(c, cfg.vct, cfg.vctTime); if (m >= 0) return m; }

  BRANCH = cfg.branch;
  const searchEnd = performance.now() + cfg.time;
  const savedDeadline = deadline; deadline = searchEnd;
  let order = pickMoves(A, cfg.branch + 4);
  let best = order[0], bestVal = -Infinity, lastScored = null;
  lastDepth = 0;
  for (let d = 1; d <= cfg.depth; d++) {
    try {
      let alpha = -Infinity; const scored = [];
      for (const m of order) {
        place(m, c);
        let v;
        try { v = -negamax(3 - c, d - 1, -Infinity, -alpha, 1); }
        finally { unplace(m); }
        scored.push([m, v]);
        if (v > alpha) alpha = v;
      }
      scored.sort((p, q) => q[1] - p[1]);
      order = scored.map(s => s[0]);
      lastScored = scored; lastDepth = d;
      best = order[0]; bestVal = scored[0][1];
      if (bestVal >= WIN - 100 || bestVal <= -WIN + 100) break;
    } catch (e) { if (e !== TIMEOUT) throw e; break; }
  }
  deadline = savedDeadline;
  if (bestVal <= -WIN + 100) best = pickMoves(A, 1)[0]; // 注定要输时，至少挡住最凶的点

  // 性格取舍：只在“真实分值与最佳手相差不超过容差”的候选之间起作用
  const hasTaste = STYLE.center || STYLE.build || STYLE.guard || STYLE.diagB || STYLE.near;
  if (hasTaste && lastScored && Math.abs(bestVal) < WIN - 1000 && stoneCount() > 2) {
    const margin = STYLE.margin || 500;
    const cand = [best, ...lastScored.map(x => x[0]).filter(m => m !== best)].slice(0, 5);
    const saved2 = deadline; deadline = performance.now() + 350;
    try {
      const exact = [];
      for (const m of cand) {
        place(m, c);
        let v; try { v = -negamax(3 - c, 4, -Infinity, Infinity, 1); } finally { unplace(m); }
        exact.push([m, v]);
      }
      const ref = exact[0][1];                       // 以深搜最佳手在同等深度下的分值为基准
      if (Math.abs(ref) < WIN - 1000) {
        let pick = best, pickScore = -Infinity;
        for (const [m, v] of exact) {
          if (v < ref - margin || Math.abs(v) >= WIN - 1000) continue;
          const sc = v + Math.max(-margin, Math.min(margin, styleBonus(m, c)));
          if (sc > pickScore) { pickScore = sc; pick = m; }
        }
        best = pick;
      }
    } catch (e) { if (e !== TIMEOUT) throw e; }
    deadline = saved2;
  }

  // 防守对手的连续冲四，以及连续活三冲四（VCT）：选好的这手下去，对方要是有杀，换一手能挡住的
  if (cfg.defend) {
    const until = performance.now() + cfg.defend;
    const oppWins = m => {
      place(m, c);
      let r = safeVcf(3 - c, cfg.vcf, Math.max(30, until - performance.now()));
      if (r < 0 && cfg.vct && performance.now() < until) r = safeVct(3 - c, cfg.vct, Math.max(30, Math.min(until - performance.now(), cfg.defend / 2)));
      unplace(m); return r;
    };
    const firstThreat = oppWins(best);
    if (firstThreat >= 0) {
      const tries = [firstThreat, ...order.filter(m => m !== best && m !== firstThreat)].slice(0, 10);
      for (const m of tries) {
        if (performance.now() > until) break;
        if (b[m] !== 0 || !legal.some(o => o.i === m)) continue;
        if (oppWins(m) < 0) { best = m; break; }
      }
    }
  }
  return best;
}

/* ---- 分析刚下的一手造成了什么威胁，并找出关键点 ---- */
export function threatInfo(i, c) {
  const tbl = exactFor(c) ? T_EXACT : T_FREE;
  let l4 = 0, r4 = 0, l3 = 0;
  for (let d = 0; d < 4; d++) {
    const sh = shapeAt(i, c, d, tbl);
    if (sh === 6) l4++; else if (sh === 5) r4++; else if (sh === 4) l3++;
  }
  if (!l4 && !r4 && !l3) return null;
  // 关键点：落在这里能成五(fives)或能成活四(fours)，只取与这手同线的点
  const fives = [], fours = [];
  const seen = new Set();
  for (let d = 0; d < 4; d++) {
    const base = (d * NN + i) * 9;
    for (let k = -4; k <= 4; k++) {
      if (!k) continue;
      const j = OFF[base + 4 + k];
      if (j < 0 || b[j] !== 0 || seen.has(j)) continue;
      seen.add(j);
      evalPoint(j, c);
      if (LV === 5) fives.push(j); else if (LV === 4) fours.push(j);
    }
  }
  let kind, keys;
  if ((l4 && !exactFor(c)) || fives.length >= 2) { kind = 'live4'; keys = fives; }
  else if (fives.length === 1) { kind = (r4 && l3) ? 'four3' : 'rush4'; keys = fives; }
  else if (fours.length >= 2 && l3 >= 2) { kind = 'double3'; keys = fours; }
  else if (fours.length >= 1 && l3) { kind = 'live3'; keys = fours; }
  else return null;
  return { kind, keys: keys.slice(0, 6), by: c };
}

/* ---- 陪练：比较你想下的一手与引擎推荐的一手 ---- */
// 给人看的建议统一用这套参数：拦截、提示、复盘建议都走它
export const ADVICE_CFG = { depth: 8, branch: 8, time: 450, vcf: 10, vcfTime: 200, vct: 3, vctTime: 200, vary: 0, advice: true };
// 搜索有时间上限，同一局面算两次可能停在不同深度、给出不同答案。
// 所以按局面缓存：一个局面只算一次，拦截和提示共用同一个结论。
let adviceCache;
function bestAdvice(color) {
  const key = `${hashKey}|${color}|${RULE}|${AWAY}`;
  if (adviceCache.has(key)) return adviceCache.get(key);
  const m = think(color, Object.assign({}, ADVICE_CFG, { advice: false }));
  if (adviceCache.size > 500) adviceCache.clear();
  adviceCache.set(key, m);
  return m;
}
export function coachCheck(color, cand) {
  const evalAfter = m => {
    place(m, color);
    let p;
    try { p = assessPosition()[0]; } finally { unplace(m); }
    return color === 1 ? p : 100 - p;
  };
  const best = bestAdvice(color);
  const res = { best, pBest: evalAfter(best), pCand: evalAfter(cand), oppMove: -1, oppKind: null, candKind: null };
  res.drop = res.pBest - res.pCand;
  place(cand, color);
  try {
    res.candKind = (threatInfo(cand, color) || {}).kind || null;
    const opp = 3 - color;
    const reply = bestAdvice(opp);
    if (reply >= 0 && b[reply] === 0) {
      place(reply, opp);
      try { res.oppMove = reply; res.oppKind = (threatInfo(reply, opp) || {}).kind || null; }
      finally { unplace(reply); }
    }
  } finally { unplace(cand); }
  return res;
}
// 引擎眼中最好的几手。第一名直接取 think() 的结论，保证和陪练的建议是同一个答案
// Pro / Long Pro 的第 3 手：只在距天元 AWAY、AWAY+1 路的一圈里挑，逐个浅搜比较
function awayRing() { const out = []; for (let i = 0; i < NN; i++) { const d = Math.max(Math.abs(i % N - 7), Math.abs(((i / N) | 0) - 7)); if (b[i] === 0 && (d === AWAY || d === AWAY + 1) && !(forbFor(1) && isForbidden(i, 0))) out.push(i); } return out; }
function awayScored(c, ms) {
  const savedB = BRANCH, saved = deadline, out = [];
  BRANCH = 8; deadline = performance.now() + ms;
  try {
    for (const m of awayRing()) { place(m, c); let v = 0; try { v = -negamax(3 - c, 3, -Infinity, Infinity, 1); } finally { unplace(m); } out.push([m, v]); }
  } catch (e) { if (e !== TIMEOUT) throw e; }
  BRANCH = savedB; deadline = saved;
  return out.sort((p, q) => q[1] - p[1]);
}
function awayMove(c, cfg) {
  const sc = awayScored(c, Math.min(900, (cfg && cfg.time) || 400));
  if (!sc.length) return awayRing()[0];
  const top = sc[0][1], pool = cfg && cfg.vary ? sc.filter(x => x[1] >= top - cfg.vary).slice(0, 4) : [sc[0]];
  return pool[(Math.random() * pool.length) | 0][0];
}
export function topMoves(color, k) {
  if (AWAY && stoneCount() === 2) return awayScored(color, 900).slice(0, k).map(([m, v]) => ({ m, v, kind: null }));
  const kindOf = m => { place(m, color); let t = null; try { t = threatInfo(m, color); } finally { unplace(m); } return t ? t.kind : null; };
  const A = analyze(color);
  if (A.myFive >= 0) return [{ m: A.myFive, v: WIN, kind: 'five' }];
  const best = bestAdvice(color);
  const out = [{ m: best, v: WIN, kind: kindOf(best) }];
  if (k <= 1) return out;
  const rest = pickMoves(A, Math.max(2 * k, 8)).filter(m => m !== best);
  const scored = [];
  const savedB = BRANCH; BRANCH = 8;
  deadline = performance.now() + 700;
  try {
    for (const m of rest) {
      place(m, color);
      let v = 0;
      try { v = -negamax(3 - color, 5, -Infinity, Infinity, 1); } finally { unplace(m); }
      scored.push({ m, v, kind: kindOf(m) });
    }
  } catch (e) { if (e !== TIMEOUT) throw e; }
  BRANCH = savedB;
  scored.sort((x, y) => y.v - x.v);
  return out.concat(scored).slice(0, k);
}

/* ---- 形势评估：返回黑棋胜率(0-100)与说明 ---- */
// 分数->胜率的映射参数由引擎自对弈数据拟合而来（按对局交叉验证）
const WR = { S: 8000, K: 1.025, B0: -0.043, FORCED: 93 };
export function assessPosition() {
  const n = stoneCount();
  if (n === 0) return [55, ''];
  const c = n % 2 === 0 ? 1 : 2, name = colorName(c), oname = colorName(3 - c);
  const toB = pc => (c === 1 ? pc : 100 - pc);
  nodes = 0; deadline = performance.now() + 400;
  const A = analyze(c);
  if (A.myFive >= 0) return [toB(97), `${name}棋下一手即可连五`];
  if (A.oppFive.length >= 2) return [toB(100 - WR.FORCED), `${oname}棋已成活四或双四，挡不住了`];
  if (!A.oppFive.length) {
    if (A.myWin4 >= 0) return [toB(WR.FORCED), `${name}棋可成活四`];
    const m = safeVcf(c, 12, 70);
    if (m >= 0) return [toB(WR.FORCED), `${name}棋有连续冲四杀`];
  }
  const savedB = BRANCH; BRANCH = 8;
  // 奇偶层交替会让分数偏向先手方，取相邻两层搜索的平均来抵消
  let v1 = A.ev, v2 = A.ev;
  try {
    deadline = performance.now() + 120; v1 = negamax(c, 5, -Infinity, Infinity, 0);
    deadline = performance.now() + 260; v2 = negamax(c, 6, -Infinity, Infinity, 0);
  } catch (e) { if (e !== TIMEOUT) throw e; }
  BRANCH = savedB;
  const v = Math.abs(v1) >= WIN - 100 || Math.abs(v2) >= WIN - 100 ? (Math.abs(v2) >= WIN - 100 ? v2 : v1) : (v1 + v2) / 2;
  if (v >= WIN - 100) return [toB(WR.FORCED), `${name}棋已有必胜手段`];
  if (v <= -WIN + 100) return [toB(100 - WR.FORCED), `${oname}棋已有必胜手段`];
  const z = Math.sign(v) * Math.log1p(Math.abs(v) / WR.S);
  const p = 100 / (1 + Math.exp(-(WR.K * z + WR.B0)));
  return [toB(Math.max(2, Math.min(98, p))), A.oppFive.length ? `${name}棋必须挡住冲四` : ''];
}

/* ---- 推演：引擎主变、连续冲四的完整手顺 ---- */
export function pvLine(color, n) {
  const out = []; let c = color;
  try {
    for (let k = 0; k < n; k++) {
      const m = bestAdvice(c);
      if (m < 0 || b[m] !== 0) break;
      place(m, c); out.push(m);
      if (isFiveMove(m, c)) break;
      c = 3 - c;
    }
  } finally { for (let k = out.length - 1; k >= 0; k--) unplace(out[k]); }
  return out;
}
// 进攻方每手都冲四、防守方只能挡：找到的就是确定的必胜手顺
export function vcfLine(c, ms) {
  const saved = deadline, out = [];
  let done = false;
  deadline = performance.now() + ms;
  try {
    for (let k = 0; k < 40; k++) {
      let m = -1;
      try { m = vcfMove(c, 18); } catch (e) { if (e !== TIMEOUT) throw e; }
      if (m < 0) break;
      place(m, c); out.push(m);
      if (isFiveMove(m, c)) { done = true; break; }
      const fp = fivePointsNear(m, c);
      if (fp.length >= 2) { done = true; break; }           // 四四或活四，挡不住
      if (fp.length !== 1) break;
      const dp = fp[0];
      if (forbFor(3 - c) && isForbidden(dp, 0)) { done = true; break; }   // 唯一的防点是黑棋禁手
      place(dp, 3 - c); out.push(dp);
      if (isFiveMove(dp, 3 - c)) break;
    }
  } finally { for (let k = out.length - 1; k >= 0; k--) unplace(out[k]); deadline = saved; }
  return { seq: done ? out : [], done };
}

// 在不打扰当前对局的前提下，临时摆出一个局面做几个快速判断
// 默认按连珠规则、不带 Pro 限制（定式、杀法题都是连珠）；对局里的临时判断传入当前棋规，Pro 限制也照当前的
export function withBoard(moves, fn, rule) {
  const sb = b.slice(), sn = near.slice(), sh = hashKey, sr = RULE, sa = AWAY;
  try {
    b.fill(0); near.fill(0); hashKey = 0; RULE = rule || 'renju'; if (!rule) AWAY = 0; rebuildShapes();
    moves.forEach((m, k) => place(m, k % 2 === 0 ? 1 : 2));
    return fn();
  } finally { b.set(sb); near.set(sn); hashKey = sh; RULE = sr; AWAY = sa; rebuildShapes(); }
}

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
// 换棋规（renju 连珠 / std 标准五子棋 / free 无禁手）；清空棋盘（落子表、邻近计数、局面哈希）
export function setRule(r) { if (RULE !== r) { RULE = r; if (SH) rebuildShapes(); } }
export function clearBoard() { b.fill(0); near.fill(0); hashKey = 0; rebuildShapes(); }

/* ---- 查表数据：模块加载时算好（棋盘、邻格表、局面哈希、置换表、棋形表、各对手的参数） ---- */
{
  NN = N * N; CENTER = 7 * N + 7;
  b = new Int8Array(NN);          // 0 空 1 黑 2 白
  near = new Int16Array(NN);
  // 每个点在四个方向上 -4..4 的邻格索引；两格以内的邻点
  OFF = new Int16Array(4 * NN * 9);
  for (let i = 0; i < NN; i++) {
    const x = i % N, y = (i / N) | 0;
    for (let d = 0; d < 4; d++) for (let k = -4; k <= 4; k++) {
      const xx = x + DX[d] * k, yy = y + DY[d] * k;
      OFF[(d * NN + i) * 9 + k + 4] = (xx >= 0 && xx < N && yy >= 0 && yy < N) ? yy * N + xx : -1;
    }
    const a = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < N && yy >= 0 && yy < N) a.push(yy * N + xx);
    }
    NEAR2.push(a);
  }
  // Zobrist 哈希与置换表
  ZOB = new Int32Array(NN * 2);
  for (let k = 0; k < ZOB.length; k++) ZOB[k] = (Math.random() * 0x100000000) | 0;
  ZOB_SIDE = (Math.random() * 0x100000000) | 0;
  TT_SIZE = 1 << TT_BITS; TT_MASK = TT_SIZE - 1;
  ttKey = new Int32Array(TT_SIZE); ttVal = new Int32Array(TT_SIZE); ttInfo = new Int32Array(TT_SIZE); ttMove = new Int32Array(TT_SIZE);
  ttMove.fill(-1);
  T_FREE = buildTable(false); T_EXACT = buildTable(true);
  SH = new Int8Array(8 * NN); KEY = new Int16Array(8 * NN); rebuildShapes();
  // 各对手 × 各难度的参数：难度定深浅，对手定棋风
  for (const o of OPPONENTS) for (const d of DIFFS) {
    const b0 = CFG[d], k = o.id + '.' + d;
    CFG[k] = Object.assign({}, b0, Object.keys(o.style).length ? { style: o.style } : {});
    if (o.varyMul && !b0.easy) { CFG[k].vary = (b0.vary || 0) * o.varyMul; CFG[k].book = (b0.book || 0) * o.varyMul; }
  }
  // 搜索有时间上限，同一局面算两次可能停在不同深度、给出不同答案。
  // 所以按局面缓存：一个局面只算一次，拦截和提示共用同一个结论。
  adviceCache = new Map();
}
