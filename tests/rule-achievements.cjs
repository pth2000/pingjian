// 按规则的成就、战绩里的「各规则」、标准五子棋的长连讲解
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(700);

  // 1. 从棋谱记录判断的规则成就
  const got = await p.evaluate(() => {
    const add = (rule, or, r = 'w') => HIST.push({ t: Date.now(), lv: 'chong.normal', h: 1, r, n: 30, ms: 1000, rule, or, m: [112], wr: [] });
    REC['chong.normal'] = { w: 5, l: 1, d: 0, streak: 0, best: 3, fast: 0 };
    add('free'); add('std', 'swap2'); add('renju', 'ss8'); add('renju', 'yama'); add('std', 'pro'); add('renju', 'tara', 'l');
    achCheck({ ev: 'load' }, true);
    return ['rules3', 'gwc', 'rwc', 'opens4'].map(id => id + ':' + !!ACH.got[id]);
  });
  console.log(got.join(' '));
  if (got.some(x => x.endsWith('false'))) fail('规则成就没达成：' + got.join(' '));
  // 只有三种开局规则赢过时，「开局百家」不该达成
  const partial = await p.evaluate(() => { const keep = HIST.splice(0); ACH.got = {}; HIST.push(...keep.filter(x => x.or !== 'pro')); achCheck({ ev: 'load' }, true); return !!ACH.got.opens4; });
  if (partial) fail('三种开局规则就给了「开局百家」');

  // 2. 下完一盘时判断的：隐藏禁手点执黑胜、标准五子棋长连
  const g2 = await p.evaluate(() => {
    achCheck({ ev: 'game', g: { win: true, human: 1, rule: 'renju', hideForb: true, aid: {}, kinds: [] } }, true);
    achCheck({ ev: 'game', g: { win: false, human: 1, rule: 'std', over6: true, aid: {}, kinds: [] } }, true);
    return [!!ACH.got.blind, !!ACH.got.over];
  });
  if (!g2[0] || !g2[1]) fail('「心中有禁」或「过犹不及」没达成：' + g2);

  // 3. 成就页、战绩页
  await p.evaluate(() => go('ach')); await p.waitForTimeout(400);
  const cats = await p.$$eval('.ach-grp h3', hs => hs.map(h => h.textContent));
  if (!cats.some(t => t.startsWith('规则'))) fail('成就页没有「规则」一组：' + cats.join(','));
  await p.screenshot({ path: 'ach_rules.png', fullPage: true });
  await p.evaluate(() => go('records')); await p.waitForTimeout(400);
  const rows = await p.$$eval('#rcRules .rc-rule b', bs => bs.map(x => x.textContent));
  console.log('各规则', rows.join(' / '));
  if (rows.length < 4 || !rows.includes('五子棋 · Swap2')) fail('战绩没有按规则分开：' + rows.join(','));
  await p.$eval('#rcRules', el => el.scrollIntoView()); await p.screenshot({ path: 'records_rules.png' });

  // 4. 标准五子棋：黑连成六子，陪练讲「长连」，对局照常继续
  const ov = await p.evaluate(async () => {
    showView('game'); S.mode = 'pvp'; S.nigiri = false; applyRuleset('std'); S.coach = true; newGame();
    for (const m of [112, 127, 113, 128, 114, 129, 116, 131, 117, 145]) humanPlay(m);
    humanPlay(115);                                  // H8 I8 J8 _ L8 M8 → 补上 K8 成六
    await new Promise(r => setTimeout(r, 1500));
    return { over: S.over, say: S.say, terms: S.terms && S.terms.over };
  });
  console.log('长连', JSON.stringify(ov).slice(0, 160));
  if (ov.over) fail('标准五子棋的长连判了胜');
  if (!ov.terms || !/长连/.test(ov.say || '')) fail('陪练没讲长连');
  await p.evaluate(() => { S.coach = false; S.mode = 'ai'; applyRuleset('renju'); newGame(); });
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
