// 战绩页：近期胜负的每一格点开那一盘复盘；对手 × 难度的格子点开只看那个组合的棋谱；人物页「和 TA 下一盘」
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 820 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    await p.evaluate(() => {
      const t0 = Date.now() - 1e7;
      [['chong.easy', 'w'], ['chong.easy', 'l'], ['laogui.normal', 'w'], ['chong.easy', 'w']].forEach(([lv, r], k) => {
        const R = REC[lv] || (REC[lv] = { w: 0, l: 0, d: 0, best: 0, streak: 0 }); R[r]++;
        HIST.push({ t: t0 + k * 1000, lv, h: 1, r, n: 9, ms: 60000, rule: 'renju', m: [112, k, 113, k + 1, 114, k + 2, 115, k + 3, 116] });   // 都是黑棋在 H8–L8 连五，白棋散在第一行
      });
      ST.stage.chong = 1; stSave();
    });
    // 近期胜负：点最后一格 → 对弈页复盘那一盘
    await p.evaluate(() => go('records')); await p.waitForTimeout(600);
    const n = await p.$$eval('#recent button', bs => bs.length);
    if (n !== 4) fail(`${w} 近期胜负应该有 4 格，实际 ${n}`);
    await p.click('#recent button:last-child'); await p.waitForTimeout(800);
    const g = await p.evaluate(() => ({ view: ui.view, review: S.review, w1: S.moves[1] }));
    if (g.view !== 'game' || g.review < 0 || g.w1 !== 3) fail(`${w} 点近期胜负没打开那一盘：` + JSON.stringify(g));
    // 对手 × 难度：点惊雷 · 入门 → 棋谱页只剩这 3 盘，带一个可以去掉的筛选
    await p.evaluate(() => { exitReview(); go('records'); }); await p.waitForTimeout(600);
    await p.click('#heat td.go button'); await p.waitForTimeout(700);
    const gs = await p.evaluate(() => ({ view: ui.view, cards: document.querySelectorAll('#games .gcard').length, lv: document.getElementById('gmLv')?.textContent }));
    if (gs.view !== 'games' || gs.cards !== 3 || !/惊雷/.test(gs.lv || '')) fail(`${w} 点格子没筛出那个组合的棋谱：` + JSON.stringify(gs));
    await p.click('#gmLv'); await p.waitForTimeout(300);
    if ((await p.$$eval('#games .gcard', x => x.length)) !== 4) fail(`${w} 去掉筛选后没显示全部棋谱`);
    // 离开再回来，筛选不留着
    await p.evaluate(() => { ui.gamesLv = 'laogui.normal'; go('home'); }); await p.waitForTimeout(300);
    await p.evaluate(() => go('games')); await p.waitForTimeout(500);
    if (await p.$('#gmLv')) fail(`${w} 离开棋谱页后筛选还在`);
    // 人物页：和 TA 下一盘 → 设置页里对手已经选好
    await p.evaluate(() => openPerson('chong')); await p.waitForTimeout(600);
    await p.click('#npPlay'); await p.waitForTimeout(500);
    const su = await p.evaluate(() => ({ view: ui.view, opp: ui.setupSel.opp }));
    if (su.view !== 'setup' || su.opp !== 'chong') fail(`${w} 和 TA 下一盘没选好对手：` + JSON.stringify(su));
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
