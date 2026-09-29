// 面向玩家的文字：各页显示出来的内容里不能有调试用语、程序术语或没填上的值（undefined、NaN、null、[object …]、没替换的 {占位}）
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const BAD = /请 TA 在旁边陪练|调试|引擎|AI 库|AI 评估|undefined|NaN|\[object|\bnull\b|\{[a-z]+\}|TODO|FIXME/;
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 820 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    await p.evaluate(() => { ST.on = true; stSave(); });
    const check = async tag => {
      const t = await p.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('[title],[aria-label],[placeholder]')].map(e => [e.title, e.getAttribute('aria-label'), e.placeholder].filter(Boolean).join(' ')).join('\n'));
      const m = t.match(BAD);
      if (m) { const i = t.indexOf(m[0]); fail(`${w} ${tag}：「${t.slice(Math.max(0, i - 20), i + 30).replace(/\n/g, ' ')}」`); }
    };
    for (const v of ['home', 'setup', 'pvp', 'records', 'games', 'ach', 'notes', 'profile', 'rules', 'shafa']) {
      await p.evaluate(v => go(v), v); await p.waitForTimeout(500); await check(v);
    }
    // 对弈：下几手、打开各页签
    await p.evaluate(() => { S.mode = 'ai'; applyRuleset('renju'); S.side = 1; newGame(); showView('game'); humanPlay(112); }); await p.waitForTimeout(1800);
    for (const tab of ['log', 'data', 'set']) { await p.evaluate(t => setTab(t), tab); await p.waitForTimeout(200); await check('game/' + tab); }
    // 定式：翻到出谱、打开「更多」
    await p.evaluate(() => go('dingshi')); await p.waitForTimeout(800); await check('dingshi');
    if (w > 820) { await p.click('#bkMore'); await p.waitForTimeout(200); await check('dingshi/more'); }
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
