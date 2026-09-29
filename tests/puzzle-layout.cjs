const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [360, 640], [412, 780]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); await p.goto(BASE); await p.waitForTimeout(600);
    await p.evaluate(() => openPuzzles()); await p.waitForTimeout(500);
    console.log(w, h, await p.evaluate(() => [getComputedStyle($('vShafa')).getPropertyValue('--bs'), $('vShafa').className, $('pzList').offsetHeight, document.body.classList.contains('ds-flow')]));
    await p.screenshot({ path: `pz_${w}x${h}.png` });
    await p.evaluate(() => openBook()); await p.waitForTimeout(500);
    console.log(' ds', await p.evaluate(() => [getComputedStyle($('vDingshi')).getPropertyValue('--bs'), $('vDingshi').className]));
    await p.screenshot({ path: `ds_${w}x${h}.png` });
    await ctx.close();
  }
  await b.close();
})();
