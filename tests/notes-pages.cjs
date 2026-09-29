const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1400, 860], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForTimeout(500);
    await p.screenshot({ path: `nt_home0_${w}.png` });
    await p.evaluate(() => {
      ST.cnt = { xieyue: 14, chong: 7, laogui: 1 }; ST.stage = { xieyue: 3, chong: 2 }; ST.total = 22;
      ST.meet = { xieyue: Date.now() - 864e5 * 9, chong: Date.now() - 864e5 * 3 }; ST.lastT = { xieyue: Date.now(), chong: Date.now() };
      ST.best = { xieyue: { long: 71, fast: 29 }, chong: { long: 40 } };
      REC['xieyue.normal'].w = 6; REC['xieyue.normal'].l = 5; REC['xieyue.hard'].l = 3; REC['chong.easy'].w = 4; REC['chong.easy'].l = 3;
      for (let i = 0; i < 12; i++) { storyLine('xieyue', ['greet', 'win', 'lose', 'draw'][i % 4]); }
      stHeard('xieyue', 'r.diag'); storyLine('chong', 'greet'); storyLine('chong', 'win');
      ST.arc.xieyue = 2; ST.arc.chong = 5;
      stSave(); showView('home');
    });
    await p.waitForTimeout(300); await p.screenshot({ path: `nt_home_${w}.png` });
    await p.evaluate(() => showView('notes')); await p.waitForTimeout(400); await p.screenshot({ path: `nt_all_${w}.png`, fullPage: true });
    await p.click('.nt-c[data-nt="xieyue"]'); await p.waitForTimeout(600); await p.screenshot({ path: `nt_xy_${w}.png`, fullPage: true });
    await p.evaluate(() => goBack()); await p.waitForTimeout(300);
    await p.click('.nt-c[data-nt="chong"]'); await p.waitForTimeout(500); await p.screenshot({ path: `nt_ch_${w}.png`, fullPage: true });
    await p.evaluate(() => { ST.bond.xieyue = 'love'; ST.bondT.xieyue = Date.now(); ST.stage.xieyue = 5; ST.bond.chong = 'friend'; ST.bondT.chong = Date.now(); ST.stage.chong = 5; showView('home'); }); await p.waitForTimeout(200);
    await p.evaluate(() => showView('profile')); await p.waitForTimeout(300);
    await p.click('.pf-bond[data-nt="xieyue"]'); await p.waitForTimeout(600); await p.screenshot({ path: `nt_xyh_${w}.png`, fullPage: true });
    await p.evaluate(() => goBack()); await p.waitForTimeout(300); await p.screenshot({ path: `nt_bonds_${w}.png`, fullPage: true });
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
