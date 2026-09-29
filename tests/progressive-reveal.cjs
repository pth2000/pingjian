const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 860 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(700);
  const shot = async (v, f, full) => { await p.evaluate(v => showView(v), v); await p.waitForTimeout(300); await p.screenshot({ path: f, fullPage: !!full }); };
  await shot('home', 'rv_home0.png'); await shot('setup', 'rv_setup0.png'); await shot('profile', 'rv_prof0.png', 1);
  const sim = async (opp) => p.evaluate((opp) => {
    showView('game'); S.mode = 'ai'; S.level = opp + '.normal'; S.human = 1; newGame();
    [112, 113, 97, 98, 82, 83, 67, 68, 52].forEach((m, k) => { place(m, k % 2 ? 2 : 1); S.moves.push(m); });
    S.over = true; S.winner = 1; S.winCells = [112, 97, 82, 67, 52]; finishGame(); return S.storyRes && S.storyRes.ups;
  }, opp);
  console.log(await sim('chong')); console.log(await sim('chong'));
  await p.waitForTimeout(1200); await p.screenshot({ path: 'rv_result.png' });
  await p.evaluate(() => hideResult());
  await shot('home', 'rv_home1.png'); await shot('setup', 'rv_setup1.png'); await shot('profile', 'rv_prof1.png', 1);
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
