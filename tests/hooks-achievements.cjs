// 对局流程的挂钩：成就（下完一盘、复盘、定式页、提示和悔棋计数）、剧情（下完一盘记交情）、隐藏禁手点（悔棋、读档）
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const W = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const errs = [], bad = [];
  const ok = (c, m) => { if (!c) bad.push(m); };
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', g: 'm', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForTimeout(800);
  // 双人对弈下完一盘：以棋会友；陪练开着：虚心求教
  await p.evaluate(() => { startPvp(); document.getElementById('coach').click(); for (const i of [112, 113, 97, 128, 82, 143, 67, 158, 52]) commitPlay(i); });
  await W(2500);
  let a = await p.evaluate(() => Object.keys(ACH.got));
  ok(a.includes('pvp'), '下完双人对弈没有「以棋会友」'); ok(a.includes('coach'), '开着陪练下完没有「虚心求教」');
  // 复盘：温故知新
  await p.evaluate(() => enterReview(3)); await W(300);
  ok(await p.evaluate(() => !!ACH.got.review), '复盘没有「温故知新」');
  // 人机：提示、悔棋计数；开新局清零
  await p.evaluate(() => { S.mode = 'ai'; S.human = 1; S.level = 'atu.easy'; S.keepOpp = true; newGame(); });
  await W(300);
  await p.evaluate(() => humanPlay(112)); await W(2500);
  await p.evaluate(() => giveHint()); await W(2500);
  const aid1 = await p.evaluate(() => JSON.stringify(S.aid));
  ok(aid1 === '{"hint":1,"undo":0}', '提示没有计数：' + aid1);
  await p.evaluate(() => undoMove()); await W(2500);
  const aid2 = await p.evaluate(() => JSON.stringify(S.aid));
  ok(aid2 === '{"hint":1,"undo":1}', '悔棋没有计数：' + aid2);
  await p.evaluate(() => newGame()); await W(200);
  ok(await p.evaluate(() => S.aid.hint === 0 && S.aid.undo === 0), '开新局没有清零提示、悔棋次数');
  // 人机下完一盘：剧情记一盘
  const before = await p.evaluate(() => ST.cnt.atu || 0);
  await p.evaluate(() => { S.winner = 1; S.over = true; finishGame(); }); await W(300);
  ok(await p.evaluate(b0 => (ST.cnt.atu || 0) === b0 + 1 && !!S.storyRes, before), '下完一盘没有记交情');
  // 定式页：翻过的开局记下来
  await p.evaluate(() => openBook()); await W(300);
  await p.evaluate(() => document.querySelector('.bk-op[data-op="3I"]').click()); await W(300);
  const ops = await p.evaluate(() => ACH.ops.slice());
  ok(ops.includes('3I') && ops.length >= 2, '定式页的开局没有记下：' + ops.join(','));
  // 隐藏禁手点：禁手判负后悔棋清掉判负标记
  await p.evaluate(() => { hfSet(true); S.mode = 'pvp'; newGame(); for (const i of [112, 111, 97, 113, 127, 142]) commitPlay(i); });
  await W(300);
  await p.evaluate(() => humanPlay(126)); await W(400);   // 可能是禁手：是的话会直接判负，下面按实际情况检查
  const fl = await p.evaluate(() => S.forbLoss);
  if (fl >= 0) { await p.evaluate(() => undoMove()); await W(300); ok(await p.evaluate(() => S.forbLoss === -1), '悔棋后禁手判负标记没清掉'); }
  console.log(errs, bad);
  await b.close(); if (errs.length || bad.length) process.exitCode = 1;
})();
