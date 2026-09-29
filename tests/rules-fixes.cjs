// 规则实现的回归：塔拉古奇第 5 手后可交换、新预设存进设置刷新后还在、开局阶段不能复盘/接着下、
// 标准五子棋（及连珠黑方）里「隔一子是长连」的假活四不当活四
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(700);
  await p.evaluate(() => showView('game'));

  // 1. 塔拉古奇-10：每一手（含第 5 手）之后都有交换；第 5 手后交换完开局结束
  const tara = await p.evaluate(() => {
    S.mode = 'pvp'; S.nigiri = false; applyRuleset('tara'); newGame();
    const log = [];
    const near = []; for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) near.push((7 + dy) * 15 + 7 + dx);
    for (let k = 0; k < 40 && S.op; k++) {
      const o = S.op; log.push(o.step + S.moves.length);
      if (o.step === 'tswap') { opChoose('keep'); continue; }
      if (o.step === 'tchoice') { opChoose('nine'); continue; }
      const n0 = S.moves.length;
      for (const i of near) { humanPlay(i); if (S.moves.length !== n0 || S.op !== o) break; }
      if (S.moves.length === n0) return { log, stuck: o.step };
    }
    return { log, op: !!S.op, n: S.moves.length };
  });
  console.log('塔拉古奇', tara.log.join(' '));
  if (tara.stuck || tara.op || tara.n !== 5) fail('塔拉古奇没走完：' + JSON.stringify(tara));
  if (!tara.log.includes('tswap5')) fail('塔拉古奇第 5 手后没有交换');

  // 2. 新加的预设存进设置，刷新后还在
  for (const id of ['tara', 'pro', 'lpro', 'swap1', 'yama', 'rif']) {
    await p.evaluate(id => { clearSaved(); S.mode = 'ai'; applyRuleset(id); savePrefs(); }, id);
    await p.reload(); await p.waitForTimeout(700);
    const got = await p.evaluate(() => rulesetNow().id);
    if (got !== id) fail(`预设 ${id} 刷新后变成了 ${got}`);
  }

  // 3. 开局阶段（Swap2 摆了两颗）不能进复盘；开局定下的几手之前不能接着下
  const rv = await p.evaluate(() => {
    showView('game'); S.mode = 'pvp'; S.nigiri = false; applyRuleset('gwc'); newGame();
    humanPlay(112); humanPlay(97);
    enterReview(1);
    return { review: S.review, op: S.op && S.op.step, n: S.moves.length };
  });
  if (rv.review >= 0 || rv.op !== 'place3' || rv.n !== 2) fail('开局阶段进了复盘：' + JSON.stringify(rv));

  // 4. 假活四：_ W _ W W W _ 在标准五子棋里不是活四（冲 8 会成六），连珠里白方算活四，无禁手都算
  const four = await p.evaluate(() => {
    const at = (x, y) => y * 15 + x, ms = [];
    [3, 5, 6, 7].forEach(x => { ms.push(at(x, 9), at(x, 7)); });     // 黑在第 9 行、白在第 7 行，交替落子
    const out = {};
    for (const r of ['std', 'renju', 'free']) out[r] = withBoard(ms, () => [evalPoint(at(8, 7), 2), evalPoint(at(8, 9), 1)], r);
    out.real = withBoard([at(5, 9), at(5, 7), at(6, 9), at(6, 7), at(9, 12), at(7, 7)], () => evalPoint(at(8, 7), 2), 'std');
    return out;
  });
  const L4 = 100000;
  if (four.std[0] >= L4 || four.std[1] >= L4) fail('标准五子棋把假活四当成活四：' + JSON.stringify(four.std));
  if (four.renju[0] < L4 || four.renju[1] >= L4) fail('连珠假活四判断不对：' + JSON.stringify(four.renju));
  if (four.free[0] < L4 || four.free[1] < L4) fail('无禁手活四判断不对：' + JSON.stringify(four.free));
  if (four.real < L4) fail('标准五子棋的真活四没认出来：' + four.real);

  await p.evaluate(() => { S.mode = 'ai'; applyRuleset('renju'); savePrefs(); });
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
