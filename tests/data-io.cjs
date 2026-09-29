// 数据迁移：「我的」里导出备份文件，再到另一台设备选择这个文件导入，角色、战绩、剧情、外观都带过去；
// 同名角色加后缀，本机其他角色保留；无效数据不导入
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const open = async (seed, w = 1440, h = 900) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true, hasTouch: w < 820 });
    await ctx.addInitScript(s => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify(s)); }, seed);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    return { ctx, p };
  };

  // 设备 A：两个角色，当前角色有战绩、剧情、深色外观
  const A = await open({ list: [{ id: 'pa', name: '阿岚', g: 'f', st: 1, t: 1700000000000 }, { id: 'pb', name: '小北', g: 'm', st: 0, t: 1700000500000 }], cur: 'pa' });
  await A.p.evaluate(() => {
    const lv = LEVELS[0]; REC[lv] = { w: 3, l: 1, d: 0, streak: 1, best: 2, fast: 0 }; saveRec();
    for (let i = 0; i < 4; i++) HIST.push({ t: Date.now() - i * 1e6, lv, h: 1, r: i ? 'w' : 'l', n: 20, ms: 1000, rule: 'renju', m: [112, 113, 127], wr: [] });
    save('hist', HIST); ST.on = true; ST.cnt = { chong: 7 }; ST.total = 7; stSave(); colorPref.value = 'dark';
    showView('profile');
  });
  await A.p.waitForTimeout(400);
  await A.p.$eval('#pfExport', el => el.scrollIntoView({ block: 'center' }));
  await A.p.screenshot({ path: 'data_profile.png' });
  const [dl] = await Promise.all([A.p.waitForEvent('download'), A.p.click('#pfExport')]);
  const name = dl.suggestedFilename();
  if (!/^pingjian-backup-\d{8}\.json$/.test(name)) fail('导出文件名不对：' + name);
  const file = 'backup.json'; await dl.saveAs(file);
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (pack.app !== 'pingjian' || !pack.data['gomoku@pa/hist'] || !pack.data['gomoku@pa/story'] || pack.roles.join() !== '阿岚,小北') fail('导出内容不全：' + Object.keys(pack.data).join(','));
  if (pack.data.gomoku_theme !== 'dark') fail('外观没导出');
  const legacyFile = 'legacy-backup.json'; fs.writeFileSync(legacyFile, JSON.stringify({ ...pack, app: 'gomoku-linxi' }));
  if (await A.p.$('#pfCopy') || await A.p.$('#pfPaste')) fail('还留着文本导出 / 导入');
  await A.ctx.close();

  // 设备 B：已有一个同名的「阿岚」（不同角色）
  const B = await open({ list: [{ id: 'pz', name: '阿岚', g: 'm', st: 1, t: 1710000000000 }], cur: 'pz' });
  await B.p.evaluate(() => showView('profile')); await B.p.waitForTimeout(300);
  // 无效文件：提示、不重载
  fs.writeFileSync('bad.json', '{"hello":1}');
  await B.p.setInputFiles('.v-profile input[type=file]', 'bad.json'); await B.p.waitForTimeout(400);
  const t1 = await B.p.evaluate(() => ui.toast.msg);
  if (!/不是有效/.test(t1)) fail('无效数据没有提示：' + t1);
  // 改名前导出的备份仍能导入
  await B.p.setInputFiles('.v-profile input[type=file]', legacyFile); await B.p.waitForTimeout(400);
  const confirmText = await B.p.evaluate(() => ui.modal.text);
  if (!/阿岚/.test(confirmText) || !/小北/.test(confirmText)) fail('导入确认没列出角色：' + confirmText);
  await Promise.all([B.p.waitForNavigation(), B.p.click('#mdOk')]); await B.p.waitForTimeout(800);
  const r = await B.p.evaluate(() => ({ list: PROFILE.list.map(x => x.id + ':' + x.name), cur: PROFILE.cur && PROFILE.cur.id, hist: HIST.length, on: ST.on, cnt: ST.cnt.chong, theme: localStorage.getItem('gomoku_theme') }));
  console.log('导入后', JSON.stringify(r));
  if (!r.list.includes('pz:阿岚') || !r.list.includes('pb:小北') || !r.list.some(x => x.startsWith('pa:阿岚·'))) fail('合并角色不对：' + r.list.join(','));
  if (r.cur !== 'pa' || r.hist !== 4 || !r.on || r.cnt !== 7 || r.theme !== 'dark') fail('导入的数据不对：' + JSON.stringify(r));

  // 再用文件导入一次：同一个角色整份替换，不重复
  await B.p.evaluate(() => showView('profile')); await B.p.waitForTimeout(300);
  await B.p.setInputFiles('.v-profile input[type=file]', file); await B.p.waitForTimeout(300);
  await Promise.all([B.p.waitForNavigation(), B.p.click('#mdOk')]); await B.p.waitForTimeout(800);
  const r2 = await B.p.evaluate(() => ({ n: PROFILE.list.length, hist: HIST.length }));
  if (r2.n !== 3 || r2.hist !== 4) fail('重复导入不对：' + JSON.stringify(r2));
  await B.ctx.close();

  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
