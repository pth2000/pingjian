const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  await p.fill('#stName', '甲'); await p.click('#stCreate button[type=submit]'); await p.waitForTimeout(1300);
  // play one real game quickly vs easy
  await p.evaluate(() => { showView('game'); S.level = 'atu.easy'; newGame(); });
  await p.waitForTimeout(2200);
  for (let k = 0; k < 40; k++) { const over = await p.evaluate(() => { if (S.over) return true; if (!myTurn() || S.thinking) return false; humanPlay(withBoard(S.moves, () => think(S.human, CFG['wuming.master']))); return false; }); if (over) break; await p.waitForTimeout(600); }
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'pf_m_result.png' });
  const a = await p.evaluate(() => [ST.total, HIST.length, Object.keys(localStorage).sort()]);
  console.log('A', JSON.stringify(a));
  await p.evaluate(() => { hideResult(); showView('profile'); }); await p.waitForTimeout(300);
  await p.screenshot({ path: 'pf_m_profile.png', fullPage: true });
  // create second profile
  await p.click('#pfNew'); await p.waitForTimeout(300); await p.fill('#stName', '乙'); await p.click('#stCreate button[type=submit]'); await p.waitForTimeout(1300);
  console.log('B', JSON.stringify(await p.evaluate(() => [PROFILE.cur.name, ST.total, HIST.length, PROFILE.list.map(x => x.name)])));
  await p.evaluate(() => showView('notes')); await p.waitForTimeout(300); await p.screenshot({ path: 'pf_m_notes.png', fullPage: true });
  await p.evaluate(() => showView('home')); await p.waitForTimeout(300); await p.screenshot({ path: 'pf_m_home.png' });
  // switch back to 甲
  await p.evaluate(() => PROFILE.use(PROFILE.list.find(x => x.name === '甲').id)); await p.waitForTimeout(1300);
  console.log('C', JSON.stringify(await p.evaluate(() => [PROFILE.cur.name, ST.total, HIST.length])));
  // delete 甲
  await p.evaluate(() => PROFILE.remove(PROFILE.cur.id)); await p.waitForTimeout(1300);
  console.log('D', JSON.stringify(await p.evaluate(() => [PROFILE.cur && PROFILE.cur.name, Object.keys(localStorage).sort()])));
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
