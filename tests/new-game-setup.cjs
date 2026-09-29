// 对局设置集中在设置页：对弈页的「设置」只列出本局设置；「新局」可以沿用设置或去设置页；双人对弈也从设置页开始；失误提醒的用语
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 820 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    // 对弈页「设置」：只有本局设置的摘要，没有选对手、改规则的控件
    await p.evaluate(() => { showView('game'); S.mode = 'ai'; S.level = 'laogui.easy'; S.randOpp = false; applyRuleset('renju'); S.coach = true; newGame(); });
    await p.waitForTimeout(400);
    const st = await p.evaluate(() => ({ sum: document.getElementById('setSum')?.textContent || '', opp: !!document.getElementById('lv-chong'), rule: !!document.getElementById('rs-gwc'), guard: document.getElementById('coachGuard')?.textContent || '' }));
    if (!/磐石/.test(st.sum) || !/连珠/.test(st.sum) || st.opp || st.rule) fail(`${w} 设置页签不对：` + JSON.stringify(st));
    if (!/失误提醒/.test(st.guard) || !/仅致命失误/.test(st.guard) || /拦/.test(st.guard)) fail(`${w} 失误提醒的用语不对：` + st.guard);
    // 对局进行中点「新局」：三个选项；「更改设置」去设置页，对手已经选好
    await p.evaluate(() => { S.human = 1; humanPlay(112); }); await p.waitForTimeout(2500);
    await p.evaluate(() => humanPlay(96)); await p.waitForTimeout(2500);
    await p.evaluate(() => { askNewGame(); }); await p.waitForTimeout(400);
    if (!(await p.$('#mdAlt'))) fail(`${w} 新局对话框没有「更改设置」`);
    if (w < 820) await p.screenshot({ path: 'ng_dialog_390.png' });
    await p.click('#mdAlt'); await p.waitForTimeout(500);
    const su = await p.evaluate(() => ({ view: VIEW, mode: setupSel.mode, opp: setupSel.opp, diff: setupSel.diff }));
    if (su.view !== 'setup' || su.mode !== 'ai' || su.opp !== 'laogui' || su.diff !== 'easy') fail(`${w} 更改设置没带上当前设置：` + JSON.stringify(su));
    // 「沿用设置」：直接重开
    await p.evaluate(() => { showView('game'); }); await p.waitForTimeout(300);
    await p.evaluate(() => { askNewGame(); }); await p.waitForTimeout(300);
    await p.click('#mdOk'); await p.waitForTimeout(400);
    if ((await p.evaluate(() => [VIEW, S.moves.length, S.level].join()))!== 'game,0,laogui.easy') fail(`${w} 沿用设置重开不对`);
    // 结算卡上有「更改设置」
    await p.evaluate(() => { S.mode = 'pvp'; S.nigiri = false; newGame(); for (const m of [112, 0, 113, 1, 114, 2, 115, 3, 116]) humanPlay(m); });
    await p.waitForTimeout(900);
    const rb = await p.evaluate(() => [...document.querySelectorAll('#result button')].map(x => x.textContent.trim()));
    if (!rb.includes('更改设置')) fail(`${w} 结算卡没有「更改设置」：` + rb.join('|'));
    await p.evaluate(() => hideResult());
    // 双人对弈从设置页开始：选规则和猜先
    await p.evaluate(() => go('pvp')); await p.waitForTimeout(500);
    const pv = await p.evaluate(() => ({ view: VIEW, mode: setupSel.mode, roster: !!document.getElementById('suOpps'), nig: !!document.getElementById('suNigiri') }));
    if (pv.view !== 'setup' || pv.mode !== 'pvp' || pv.roster || !pv.nig) fail(`${w} 双人对弈设置页不对：` + JSON.stringify(pv));
    await p.click('#su-free'); await p.evaluate(() => { setupSel.nigiri = false; });
    await p.click('#suStart'); await p.waitForTimeout(500);
    const g = await p.evaluate(() => ({ view: VIEW, mode: S.mode, rule: S.rule, nig: !!gv.nigiri }));
    if (g.view !== 'game' || g.mode !== 'pvp' || g.rule !== 'free' || g.nig) fail(`${w} 从设置页开双人对弈不对：` + JSON.stringify(g));
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
