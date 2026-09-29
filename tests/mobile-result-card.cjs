const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[390, 844], [844, 390], [1400, 860]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    await p.evaluate(() => go('game'));
    await p.waitForTimeout(300);
    console.log(w, 'after tab', await p.evaluate(() => VIEW));
    await p.evaluate(() => { document.querySelector('.su-opp:nth-child(7)').click(); setupSel.diff = 'easy'; });
    await p.click('#suStart'); await p.waitForTimeout(2300);
    const bw0 = await p.evaluate(() => size);
    for (let k = 0; k < 40; k++) { const over = await p.evaluate(() => { if (S.over) return true; if (!myTurn() || S.thinking) return false; humanPlay(withBoard(S.moves, () => think(S.human, CFG['wuming.master']))); return false; }); if (over) break; await p.waitForTimeout(500); }
    await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__lc = 0; const f = layout; layout = function () { window.__lc++; return f.apply(this, arguments); }; });
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => { const r = $('result').getBoundingClientRect(), c = document.querySelector('.result-card').getBoundingClientRect(), a = $('actions').getBoundingClientRect(); return { lc: window.__lc, size, cardBottom: Math.round(c.bottom), barTop: Math.round(a.top), vh: innerHeight, scroll: document.documentElement.scrollHeight - innerHeight }; });
    console.log(w, 'bw0', bw0, JSON.stringify(info));
    await p.screenshot({ path: `ux_res_${w}.png` });
    await p.mouse.click(5, h - 100 > 0 ? 80 : 10); await p.waitForTimeout(300);
    console.log(w, 'result hidden after outside click', await p.evaluate(() => $('result').hidden), 'size', await p.evaluate(() => size));
    await p.screenshot({ path: `ux_board_${w}.png` });
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
