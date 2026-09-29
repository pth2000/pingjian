const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1280, 820]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', g: 'm', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForTimeout(600);
  await p.evaluate(() => showView('setup')); await p.waitForTimeout(300);
  console.log('setup toggle', await p.evaluate(() => [!!$('suHideForb'), !!$('hideForb'), $('suHideForb').checked]));
  await p.click('#suHideForbRow'); await p.waitForTimeout(200);
  console.log('after click', await p.evaluate(() => [S.hideForb, $('suStartSub').textContent]));
  await p.screenshot({ path: `hf_setup_${w}.png` });
  await p.click('#suStart'); await p.waitForTimeout(3500);
  const moves = [111, 0, 112, 14, 83, 210, 98, 224];
  console.log(await p.evaluate(mv => { S.mode = 'ai'; S.human = 1; loadGame(mv); return [toMove(), isForbidden(113, 0), S.forb.length]; }, moves));
  await p.evaluate(() => humanPlay(113)); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => [S.moves.join(','), S.over, S.winner, S.forbLoss, S.forbWhy, $('resTitle').textContent, $('resSub').textContent]));
  await p.screenshot({ path: `hf_lose_${w}.png` });
  await p.evaluate(() => { hideResult(); }); await p.waitForTimeout(300); await p.screenshot({ path: `hf_board_${w}.png` });
  // 读回存档也还是判负
  await p.reload(); await p.waitForTimeout(900);
  console.log('reload', await p.evaluate(() => [S.over, S.forbLoss, S.moves.join(',')]));
  // 关掉：禁手点不能下
  await p.evaluate(() => { S.hideForb = false; loadGame([111, 0, 112, 14, 83, 210, 98, 224]); humanPlay(113); }); await p.waitForTimeout(400);
  console.log('off', await p.evaluate(() => [S.over, S.moves.length, S.forb.length]));
  await ctx.close(); }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
