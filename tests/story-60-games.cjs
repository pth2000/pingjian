const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 860 } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // seed old-version data to check cleanup
  await p.goto(BASE); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('gomoku-rec', '{"x":1}'); localStorage.setItem('gomoku-hist', '[1,2]'); });
  await p.reload(); await p.waitForTimeout(900);
  console.log('keys after first load', await p.evaluate(() => Object.keys(localStorage)));
  await p.screenshot({ path: 'st_create.png' });
  await p.fill('#stName', '阿岚'); await p.click('#stCreate button[type=submit]');
  await p.waitForTimeout(1500);
  console.log('profile', await p.evaluate(() => [PROFILE.cur && PROFILE.cur.name, Object.keys(localStorage)]));
  const sim = async (opp, win) => p.evaluate(([opp, win]) => {
    showView('game'); S.mode = 'ai'; S.level = opp + '.normal'; S.human = 1; newGame();
    const mv = [112, 113, 97, 98, 82, 83, 67, 68, 52]; mv.forEach((m, k) => { place(m, k % 2 ? 2 : 1); S.moves.push(m); });
    S.over = true; S.winner = win ? 1 : 2; S.winCells = [112, 97, 82, 67, 52]; finishGame();
    return S.storyRes && [S.storyRes.line, S.storyRes.ups, S.storyRes.ev && S.storyRes.ev.kind];
  }, [opp, win]);
  const plan = [];
  for (let i = 0; i < 40; i++) plan.push('chong'); for (let i = 0; i < 12; i++) plan.push('laogui'); for (let i = 0; i < 8; i++) plan.push('atu'); plan.push('chong');
  let k = 0;
  for (const o of plan) { const r = await sim(o, k % 3 !== 0); k++; if (r && (r[1].length || r[2])) console.log(k, o, JSON.stringify(r)); await p.waitForTimeout(40); }
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'st_result.png' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'st_final.png' });
  console.log('ST', await p.evaluate(() => JSON.stringify({ total: ST.total, cnt: ST.cnt, stage: ST.stage, arc: ST.arc, bond: ST.bond })));
  await p.evaluate(() => { stClose(); hideResult(); showView('notes'); }); await p.waitForTimeout(400);
  await p.screenshot({ path: 'st_notes.png', fullPage: true });
  await p.evaluate(() => showView('profile')); await p.waitForTimeout(400);
  await p.screenshot({ path: 'st_profile.png', fullPage: true });
  await p.evaluate(() => showView('setup')); await p.waitForTimeout(300); await p.click('.su-opp:nth-child(3)'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'st_setup.png' });
  await p.evaluate(() => showView('home')); await p.waitForTimeout(300); await p.screenshot({ path: 'st_home.png' });
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
