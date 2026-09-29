// 手机上「我的」里的去处（札记、战绩、棋谱、成就、规则）点得动；对手页只有没下完的对局才有「返回对局」；
// 杀法、定式的横向列表滑动时左边不露缝
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(700);

  await p.evaluate(() => { ST.on = true; stSave(); showView('profile'); }); await p.waitForTimeout(300);
  const links = await p.$$eval('.pf-go a', as => as.map(a => a.getAttribute('href').slice(2)));
  if (links.join() !== 'notes,records,games,ach,rules') fail('我的 · 去处不对：' + links.join());
  for (const v of links) {
    await p.evaluate(() => showView('profile')); await p.waitForTimeout(200);
    await p.click(`.pf-go a[href="#/${v}"]`); await p.waitForTimeout(300);
    const now = await p.evaluate(() => ui.view);
    if (now !== v) fail(`点「${v}」没有跳过去（停在 ${now}）`);
  }

  // 对手页的「返回对局」
  const backAt = async () => { await p.evaluate(() => showView('setup')); await p.waitForTimeout(250); return !!(await p.$('#suBack')); };
  await p.evaluate(() => { S.mode = 'ai'; applyRuleset('renju'); S.side = 1; newGame(); });
  if (await backAt()) fail('还没落子就显示了「返回对局」');
  await p.evaluate(() => { showView('game'); humanPlay(112); }); await p.waitForTimeout(1500);
  if (!(await backAt())) fail('下到一半没有「返回对局」');
  await p.click('#suBack'); await p.waitForTimeout(300);
  if ((await p.evaluate(() => ui.view)) !== 'game') fail('「返回对局」没回到棋盘');
  await p.evaluate(() => { S.over = true; }); 
  if (await backAt()) fail('对局结束了还显示「返回对局」');
  await p.evaluate(() => { S.over = false; newGame(); });

  // 杀法、定式的横向列表：滑动到任何位置，吸在左边的「入门」「直指」标签都贴住列表左缘，
  // 而且把滑到它底下的选中项（连外圈描边）整个盖住，不露缝
  for (const [go, sel] of [['openPuzzles(0)', '#pzList'], ["showView('dingshi')", '.v-dingshi .bk-list']]) {
    await p.evaluate(g => eval(g), go); await p.waitForTimeout(700);
    // 每组不能被压窄：最后一项伸出组外的话，标签交接时会从旁边露出来
    const over = await p.evaluate(sel => Math.max(...[...document.querySelectorAll(sel + ' .bs-grp')].map(g => g.lastElementChild.getBoundingClientRect().right - g.getBoundingClientRect().right)), sel);
    if (over > 0.5) fail(`${sel} 组被压窄，最后一项伸出 ${over}px`);
    for (const x of [30, 60, 90, 120, 150, 250, 400]) {
      const r = await p.evaluate(([sel, x]) => {
        const l = document.querySelector(sel); l.scrollLeft = x;
        const L = l.getBoundingClientRect(), g = l.querySelector('.bs-grp'), k = g.querySelector('.bs-k').getBoundingClientRect();
        const on = l.querySelector('.on, [aria-pressed="true"], .cur');
        let leak = 0;
        if (on) { const c = on.getBoundingClientRect(); if (c.left < k.right && c.right > L.left) leak = Math.max(0, k.top - (c.top - 4), (c.bottom + 4) - k.bottom); }
        // 这一组已经滑过左缘：标签应当吸在最左边
        return { gap: g.getBoundingClientRect().left < L.left - 0.5 ? k.left - L.left : 0, leak };
      }, [sel, x]);
      if (Math.abs(r.gap) > 0.5) fail(`${sel} 滑到 ${x} 左边露缝 ${r.gap}px`);
      if (r.leak > 0.5) fail(`${sel} 滑到 ${x} 选中项外圈从标签上下露出 ${r.leak}px`);
    }
  }

  // 电脑屏：切到对弈、定式、杀法时侧栏不收起（宽屏展开、窄屏收成图标，各页一致）
  for (const [w, h, want] of [[1440, 900, 220], [1920, 1080, 220], [1280, 800, 220], [1100, 800, 72]]) {
    const dc = await b.newContext({ viewport: { width: w, height: h } });
    await dc.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const d = await dc.newPage(); d.on('pageerror', e => errs.push(e.message));
    await d.goto(BASE); await d.waitForTimeout(600);
    for (const v of ['home', 'game', 'dingshi', 'shafa', 'records', 'profile']) {
      await d.evaluate(v => go(v), v); await d.waitForTimeout(250);
      const nw = await d.evaluate(() => Math.round(document.querySelector('.sidenav').getBoundingClientRect().width));
      const ox = await d.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (nw !== want) fail(`${w} 宽时「${v}」页侧栏宽 ${nw}，应为 ${want}`);
      if (ox > 0) fail(`${w} 宽时「${v}」页横向溢出 ${ox}px`);
    }
    await dc.close();
  }

  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
