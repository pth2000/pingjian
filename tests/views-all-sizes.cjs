const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1400, 860], [1024, 700], [390, 844], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    // seed some story
    await p.evaluate(() => { ST.cnt = { chong: 13, xieyue: 7, atu: 3 }; ST.stage = { chong: 3, xieyue: 2, atu: 1 }; ST.got = [{ id: 'chong', k: 0 }, { id: 'chong', k: 1 }, { id: 'chong', k: 2 }, { id: 'xieyue', k: 0 }, { id: 'xieyue', k: 1 }, { id: 'atu', k: 0 }]; ST.total = 23; stSave(); });
    const out = [];
    for (const v of ['home', 'setup', 'notes', 'profile', 'game', 'dingshi', 'shafa', 'rules', 'ach']) {
      await p.evaluate(v => showView(v), v); await p.waitForTimeout(350);
      out.push(v + ':' + await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
      if (['setup', 'notes', 'profile'].includes(v)) await p.screenshot({ path: `all_${v}_${w}.png`, fullPage: v !== 'setup' });
    }
    await p.evaluate(() => replayTale({ id: 'chong', i: 0 })); await p.waitForTimeout(300); await p.screenshot({ path: `all_tale_${w}.png` });
    console.log(w, h, out.join(' '));
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
