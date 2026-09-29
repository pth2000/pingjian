// 认输；下完后悔棋 / 接着下算「续下」：一盘棋只记一次结果
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 820 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    const rec = () => p.evaluate(() => { const r = REC[S.level] || {}; return { l: r.l || 0, w: r.w || 0, h: HIST.length, pb: REC.pvp.b, over: S.over, settled: !!S.settled, rs: S.resigned || 0, last: HIST[HIST.length - 1] || null }; });

    // 1. 人机对弈认输：按钮 → 确认 → 记一局负
    await p.evaluate(() => { showView('game'); S.mode = 'ai'; applyRuleset('renju'); S.side = 1; newGame(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => humanPlay(112)); await p.waitForTimeout(1800);
    if (!(await p.$('#btnResign'))) fail(`${w} 对局中没有认输按钮`);
    const r0 = await rec();
    await p.click('#btnResign'); await p.waitForTimeout(250);
    if (w === 1440) await p.screenshot({ path: 'resign_confirm.png' });
    await p.click('#mdOk'); await p.waitForTimeout(900);
    const r1 = await rec();
    if (!r1.over || r1.rs !== 1 || r1.l !== r0.l + 1 || r1.h !== r0.h + 1 || !r1.last || r1.last.r !== 'l' || r1.last.rs !== 1) fail(`${w} 认输没记成负：` + JSON.stringify({ r0, r1 }));
    const card = await p.evaluate(() => gv.resultOn && gv.result.title);
    if (!/认输/.test(card || '')) fail(`${w} 结算卡没写认输：${card}`);
    if (w === 1440) await p.screenshot({ path: 'resign_result.png' });
    if (await p.$('#btnResign')) fail(`${w} 下完了还显示认输`);
    // 刷新后仍是认输结束的局面
    await p.reload(); await p.waitForTimeout(900);
    const r2 = await p.evaluate(() => ({ over: S.over, rs: S.resigned, settled: !!S.settled }));
    if (!r2.over || r2.rs !== 1 || !r2.settled) fail(`${w} 刷新后认输状态丢了：` + JSON.stringify(r2));

    // 2. 认输后悔棋接着下，再认输：不再记
    await p.evaluate(() => { showView('game'); hideResult(); undoMove(); }); await p.waitForTimeout(600);
    await p.evaluate(() => { if (!S.moves.length || S.moves.length % 2 === 0) humanPlay(S.moves.includes(112) ? 96 : 112); }); await p.waitForTimeout(1800);
    const r3 = await rec();
    if (r3.over || !r3.settled) fail(`${w} 悔棋后没有变成续下：` + JSON.stringify(r3));
    const note = await p.evaluate(() => document.getElementById('notice') ? document.getElementById('notice').textContent : document.body.innerText);
    if (!/不计战绩/.test(note)) fail(`${w} 续下时没有提示不计战绩`);
    await p.evaluate(() => { resign(); }); await p.waitForTimeout(200); await p.click('#mdOk'); await p.waitForTimeout(900);
    const r4 = await rec();
    if (!r4.over || r4.l !== r1.l || r4.h !== r1.h) fail(`${w} 续下后认输又记了一次：` + JSON.stringify({ r1, r4 }));
    const sub4 = await p.evaluate(() => gv.result && gv.result.sub);
    if (!/不计入战绩/.test(sub4 || '')) fail(`${w} 续下的结算卡没说明不计战绩：${sub4}`);

    // 3. 双人对弈：黑五连记一次；悔一步再下成五连，不再记
    await p.evaluate(() => { hideResult(); S.mode = 'pvp'; S.nigiri = false; applyRuleset('free'); newGame(); });
    await p.waitForTimeout(300);
    const p0 = await rec();
    await p.evaluate(() => { for (const m of [112, 127, 113, 128, 114, 129, 115, 130]) humanPlay(m); humanPlay(116); });
    await p.waitForTimeout(900);
    const p1 = await rec();
    if (!p1.over || p1.pb !== p0.pb + 1 || p1.h !== p0.h + 1) fail(`${w} 双人黑胜没记上：` + JSON.stringify({ p0, p1 }));
    await p.evaluate(() => { hideResult(); undoMove(); humanPlay(116); }); await p.waitForTimeout(900);
    const p2 = await rec();
    if (!p2.over || p2.pb !== p1.pb || p2.h !== p1.h) fail(`${w} 悔一步再赢又记了一次：` + JSON.stringify({ p1, p2 }));
    // 双人认输：选另一方
    await p.evaluate(() => { hideResult(); newGame(); humanPlay(112); humanPlay(113); }); await p.waitForTimeout(300);
    const q0 = await rec();
    await p.click('#btnResign'); await p.waitForTimeout(250);
    await p.click('#mdAlt'); await p.waitForTimeout(900);          // 轮到黑：另一方是白方认输
    const q1 = await p.evaluate(() => ({ over: S.over, winner: S.winner, rs: S.resigned, w: REC.pvp.b }));
    if (!q1.over || q1.rs !== 2 || q1.winner !== 1 || q1.w !== q0.pb + 1) fail(`${w} 双人白方认输不对：` + JSON.stringify(q1));

    // 4. 历史棋局接着下不记
    const h0 = await rec();
    await p.evaluate(() => { hideResult(); S.mode = 'ai'; applyRuleset('renju'); newGame(); });
    await p.evaluate(() => openHist(HIST[HIST.length - 1].t)); await p.waitForTimeout(500);
    const hs = await p.evaluate(() => !!S.settled);
    if (!hs) fail(`${w} 载入的历史棋局没标成已记过`);
    await p.evaluate(() => { S.mode = 'ai'; applyRuleset('renju'); newGame(); });
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
