const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1280, 820], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(BASE); await p.waitForTimeout(600);
    await p.screenshot({ path: `id_create_${w}.png` });
    await p.click('.st-g:nth-child(2)'); await p.fill('#stName', '小岚'); await p.click('#stOn'); await p.waitForTimeout(200); await p.screenshot({ path: `id_create_off_${w}.png` }); await p.click('#stCreate button[type=submit]');
    await p.waitForTimeout(1200);
    console.log('after create', await p.evaluate(() => [PROFILE.cur.name, PROFILE.cur.g, ST.on, document.body.dataset.view]));
    await p.screenshot({ path: `id_home_off_${w}.png` });
    await p.evaluate(() => showView('profile')); await p.waitForTimeout(300); await p.screenshot({ path: `id_prof_off_${w}.png`, fullPage: true });
    // 开剧情，彩蛋开调试
    await p.click('#pfStory'); await p.waitForTimeout(300);
    for (let i = 0; i < 5; i++) await p.click('.brand .seal:visible');
    await p.waitForTimeout(400);
    console.log('dbg', await p.evaluate(() => [DBG.on, !!$('dbgChip')]));
    await p.evaluate(() => dbgOpen()); await p.waitForTimeout(300);
    await p.click('#dbgBody [data-d="cnt"][data-id="xieyue"][data-n="6"]'); await p.waitForTimeout(200);
    await p.click('#dbgBody [data-d="game"][data-id="chong"][data-o="win"]'); await p.waitForTimeout(200);
    await p.click('#dbgBody [data-d="game"][data-id="chong"][data-o="win"]'); await p.waitForTimeout(400);
    await p.screenshot({ path: `id_dbg_${w}.png` });
    console.log(await p.evaluate(() => [storyLine('xieyue','greet'), storyLine('wuming','lose'), stFill('{后生可畏|姑娘好本事}。', 'wuming'), stFill('{call}来了', 'xieyue')]));
    await p.click('#dbgBody [data-d="final"][data-id="xieyue"]'); await p.waitForTimeout(700); await p.screenshot({ path: `id_final_${w}.png` });
    await p.click('[data-bond="friend"]'); await p.waitForTimeout(300); await p.screenshot({ path: `id_bond_${w}.png` });
    await p.evaluate(() => stClose());
    await p.evaluate(() => showView('profile')); await p.waitForTimeout(300); await p.screenshot({ path: `id_prof_on_${w}.png`, fullPage: true });
    await p.click('#pfRename'); await p.waitForTimeout(300); await p.screenshot({ path: `id_edit_${w}.png` });
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
