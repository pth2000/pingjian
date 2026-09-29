// 陪练：开局按对手说一句、有杀没走的提醒、拦棋三档、话里的坐标能在棋盘上闪、下完跟陪练复盘
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE); await p.waitForTimeout(800);
  const settle = () => p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); for (let k = 0; k < 80 && S.thinking; k++) await new Promise(r => setTimeout(r, 200)); await new Promise(r => setTimeout(r, 1800)); });
  const txt = h => String(h || '').replace(/<[^>]+>/g, '');

  // 1 开局：人机对弈时陪练的第一句是招呼或者针对对手的提醒，台词里不再有胡同腔和网络用语
  const greets = await p.evaluate(() => { const out = []; S.mode = 'ai'; S.level = 'laogui.normal'; S.coach = true; showView('game'); for (const id of ['laochen', 'xiaotang', 'xiaoqing']) { S.coachId = id; for (let k = 0; k < 4; k++) { newGame(); out.push(S.say); } } return out; });
  if (greets.some(g => !g)) fail('开局没说话');
  const all = await p.evaluate(() => JSON.stringify(window.COACHES));
  for (const w of ['好耶', '情绪价值', '神仙对局', '嘬', '甭', '遛弯', '搭子', '倒霉蛋', '铁粉']) if (all.includes(w)) fail('台词里还有「' + w + '」');
  console.log('开局：', greets.slice(0, 3).map(txt).join(' | '));

  // 0 双人对弈开局前猜先：猜完才能落子
  await p.evaluate(() => { S.mode = 'pvp'; S.nigiri = true; newGame(); });
  await p.waitForTimeout(300);
  if (!(await p.$('#nigiri'))) fail('双人对弈开局没有猜先');
  await p.evaluate(() => humanPlay(112));
  if (await p.evaluate(() => S.moves.length)) fail('猜先没猜完就能落子');
  await p.click('#ngOdd'); await p.waitForTimeout(400);
  const ng = await p.evaluate(() => ({ n: gv.nigiri && gv.nigiri.n, stones: document.querySelectorAll('.ng-pair i').length }));
  if (!ng.n || ng.stones !== ng.n) fail('猜先没摆出那把棋子：' + JSON.stringify(ng));
  await p.screenshot({ path: 'coach_nigiri.png' });
  await p.click('#ngGo'); await p.waitForTimeout(200);
  await p.evaluate(() => humanPlay(112));
  if ((await p.evaluate(() => S.moves.length)) !== 1) fail('猜完先还是不能落子');

  // 2 双人：黑有活三却下到别处 → 陪练不能替任何一方支招（不说哪里更好、不说有杀、不标更好的点）
  await p.evaluate(() => { S.mode = 'pvp'; S.nigiri = false; S.coachId = 'xiaoqing'; newGame(); for (const m of [112, 0, 113, 14, 114, 210]) humanPlay(m); });
  await settle(); await p.evaluate(() => humanPlay(200)); await settle();
  const pm = await p.evaluate(() => ({ say: S.say, marks: S.marks }));
  if (/更好|有杀|胜路|能赢|取胜|G8/.test(txt(pm.say)) || (pm.marks && (pm.marks.best >= 0 || pm.marks.bad >= 0))) fail('双人对弈时陪练支招了：' + txt(pm.say) + ' ' + JSON.stringify(pm.marks));
  // 双人对弈里黑棋做出活三：陪练可以说，但不支招
  await p.evaluate(() => { newGame(); for (const m of [112, 0, 113, 14]) humanPlay(m); }); await settle();
  await p.evaluate(() => humanPlay(114)); await settle();
  const pa = await p.evaluate(() => S.say);
  if (/留神|小心|留意/.test(txt(pa))) fail('双人对弈时陪练提醒了对方：' + txt(pa));

  // 4 拦棋三档：白有活三、黑下到角上 → 0 不拦（事后只说话、不在棋盘上画），1 和 2 都拦（拦的时候才画）
  for (const g of [0, 1, 2]) {
    await p.evaluate(g => { S.mode = 'pvp'; S.nigiri = false; newGame(); for (const m of [112, 96, 0, 97, 14, 98]) humanPlay(m); S.mode = 'ai'; S.level = 'chong.normal'; S.human = 1; S.guard = g; S.coachId = 'laochen'; }, g);
    await settle(); await p.evaluate(() => humanPlay(210)); await settle();
    const r = await p.evaluate(() => ({ pend: !!S.pending, marks: S.marks, say: S.say }));
    if (g === 0 && r.pend) fail('不拦的档位拦了棋');
    if (g > 0 && !r.pend) fail(`拦棋第 ${g} 档没拦下要命的一手`);
    if (g > 0 && (!r.marks || r.marks.bad !== 210)) fail(`第 ${g} 档拦棋时没在棋盘上标出这手`);
    if (g === 0 && r.marks) fail('不拦棋时陪练在棋盘上画了标记');
    if (g === 1) {
      await p.screenshot({ path: 'coach_guard.png' });
      // 话里的坐标：指上去，棋盘上那一点闪
      await p.hover('#coachWhy .pt'); await p.waitForTimeout(100);
      if (!(await p.evaluate(() => !!S.flash))) fail('指到坐标没有闪');
    }
    await p.evaluate(() => { if (S.pending) coachKeep(); }); await settle();
  }

  // 5 下完跟陪练复盘：结算卡上有按钮，讲解卡一处一处翻，结束后退出复盘
  await p.evaluate(() => { S.mode = 'ai'; S.level = 'chong.normal'; S.human = 1; S.guard = 0; newGame(); });
  await settle();
  await p.evaluate(async () => { for (const m of [112, 127, 96, 0, 14, 210, 224, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) { if (S.over) break; if (S.moves.includes(m)) continue; humanPlay(m); for (let k = 0; k < 60 && (S.thinking || !myTurn()) && !S.over; k++) await new Promise(r => setTimeout(r, 200)); } });
  await p.waitForTimeout(1500);
  if (!(await p.$('#resLesson'))) fail('结算卡上没有「跟陪练复盘」');
  else {
    await p.click('#resLesson');
    await p.waitForFunction(() => S.lesson && S.lesson.list.length && S.lesson.list[0].st === 'ok', null, { timeout: 20000 }).catch(() => fail('复盘讲解没算出来'));
    const L = await p.evaluate(() => ({ n: S.lesson.list.length, k: S.lesson.list[0].k, review: S.review, text: document.querySelector('#lesson .ls-text')?.textContent, marks: S.marks }));
    if (L.review !== L.k) fail('讲解没翻到那一手');
    if (!L.text || !L.marks) fail('讲解卡没内容或棋盘没标注');
    console.log('复盘讲解：', L.n, '处 ·', L.text);
    await p.screenshot({ path: 'coach_lesson.png' });
    if (await p.$('#lsLine')) { await p.click('#lsLine'); await p.waitForTimeout(300); if (!(await p.evaluate(() => S.marks && S.marks.seq))) fail('「看后面怎么走」没摆出手顺'); }
    for (let k = 0; k < L.n; k++) { await p.click('#lsNext'); await p.waitForTimeout(k < L.n - 1 ? 2500 : 500); }
    const end = await p.evaluate(() => ({ lesson: S.lesson, review: S.review }));
    if (end.lesson || end.review !== -1) fail('讲完没退出复盘');
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
