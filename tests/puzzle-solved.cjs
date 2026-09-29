const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1400, 860]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', g: 'm', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForTimeout(600);
    await p.evaluate(async () => {
      openPuzzles(0); await new Promise(r => setTimeout(r, 300));
      for (let n = 0; n < 12 && !PZ.over; n++) {
        const sol = await pzSolve(pzLine()); if (!sol.done) break;
        await pzPlay(sol.seq[0]); while (PZ.busy) await new Promise(r => setTimeout(r, 50));
        if (!PZ.over && PZ.msg && /成五/.test(PZ.msg.html)) { const fp = withBoard(pzLine(), () => cands().filter(i => { place(i, pzP().a); const f = isFiveMove(i, pzP().a); unplace(i); return f; })); if (fp.length) await pzPlay(fp[0]); }
      }
    });
    await p.waitForTimeout(700); await p.screenshot({ path: `pzw_a_${w}.png` });
    await p.waitForTimeout(2400); await p.screenshot({ path: `pzw_b_${w}.png` });
    console.log(await p.evaluate(() => [PZ.over, JSON.stringify(PZ.win)]));
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
