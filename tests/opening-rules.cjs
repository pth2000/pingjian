// 开局规则：Swap2、索索夫-8 在人机对弈（我先摆 / 对手先摆）和双人对弈（猜先定甲）里都能走完，走完正常对局；摆到一半刷新能接着走
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch(); const errs = [], fail = m => { errs.push(m); console.log('✗', m); };
  const shots = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 820 });
    await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'ptest', name: '测试员', t: Date.now() }], cur: 'ptest' })); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE); await p.waitForTimeout(700);
    await p.evaluate(() => showView('game'));

    // 人这边怎么走：点棋盘的步骤挑个合规的点，按钮步骤按给定的偏好点
    const drive = async (tag, prefer = {}) => {
      const seen = [];
      for (let k = 0; k < 400; k++) {
        const st = await p.evaluate(() => S.op ? { step: S.op.step, mine: S.op.mine, busy: S.op.busy, n: S.moves.length, offers: S.op.offers.length, need: S.op.n } : null);
        if (!st) return seen;
        if (!seen.includes(st.step)) seen.push(st.step);
        const btn = await p.$$eval('#opening .op-acts button', bs => bs.map(x => x.id));
        if (btn.length && !st.busy) {
          const want = prefer[st.step];
          const id = want && btn.includes(want) ? want : btn.includes('op-n3') ? 'op-n3' : btn[0];
          if (shots[st.step] === undefined && w === 1440) { shots[st.step] = 1; await p.screenshot({ path: `op_${st.step}.png` }); }
          await p.click('#' + id); await p.waitForTimeout(150); continue;
        }
        if (st.mine) {
          if (shots[st.step + w] === undefined && (st.step === 'offer' || st.step === 'pick' || st.step === 'open' || w < 820)) { shots[st.step + w] = 1; await p.screenshot({ path: `op_${st.step}_${w}.png` }); }
          const ok = await p.evaluate(() => {
            const o = S.op, n0 = S.moves.length, f0 = o.offers.length;
            const near = []; for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) near.push((7 + dy) * 15 + 7 + dx);
            const list = o.step === 'pick' ? o.offers.slice() : near;
            for (const i of list) { if (o.step === 'offer' && o.offers.includes(i)) continue; humanPlay(i); if (S.op !== o || S.moves.length !== n0 || o.offers.length !== f0 || !S.op) return true; }
            return false;
          });
          if (!ok) { fail(`${tag} ${st.step} 找不到能点的点`); return seen; }
          await p.waitForTimeout(120); continue;
        }
        await p.waitForTimeout(150);
      }
      fail(`${tag} 开局没走完：` + JSON.stringify(await p.evaluate(() => S.op))); return [];
    };
    const after = tag => p.evaluate(tag => {
      const r = { n: S.moves.length, human: S.human, op: S.op, over: S.over, card: !!document.getElementById('opening') };
      return r;
    }, tag);
    const settle = () => p.evaluate(async () => { for (let k = 0; k < 60 && (S.thinking || (!S.over && !S.op && S.mode === 'ai' && ((S.moves.length % 2 === 0 ? 1 : 2) !== S.human))); k++) await new Promise(r => setTimeout(r, 200)); });

    for (const [rule, first, prefer] of [['swap2', 'me', { choose2: 'op-black' }], ['swap2', 'opp', { choose: 'op-more' }], ['ss8', 'me', { swap1: 'op-white', swap2: 'op-keep' }], ['ss8', 'opp', { swap1: 'op-black' }],
      ['swap1', 'me', {}], ['swap1', 'opp', { choose: 'op-black' }], ['rif', 'opp', { swap1: 'op-black' }], ['yama', 'me', {}], ['tara', 'me', { tswap: 'op-swap', tchoice: 'op-ten' }], ['tara', 'opp', {}]]) {
      if (w < 820 && (first === 'opp' || rule !== 'ss8')) continue;     // 手机上只跑一种，看版面
      const tag = `${w} 人机 ${rule} ${first}`;
      await p.evaluate(([rule, first]) => { S.mode = 'ai'; S.level = 'chong.hard'; S.rule = 'renju'; S.openRule = rule; S.opFirst = first; S.coach = false; S.side = 1; newGame(); }, [rule, first]);
      await p.waitForTimeout(200);
      if (!(await p.$('#opening'))) fail(`${tag} 没出开局卡`);
      // Swap2 配无禁手、索索夫-8 配标准规则
      const rl = await p.evaluate(() => ({ rule: S.rule, eng: RULE }));
      const want = rule.startsWith('swap') ? 'std' : 'renju';   // Swap / Swap2 配标准五子棋，其余配连珠
      if (rl.rule !== want || rl.eng !== want) fail(`${tag} 棋规不对：` + JSON.stringify(rl));
      if (await p.evaluate(() => { const n = S.moves.length; if (S.op.mine) return false; humanPlay(96); return S.moves.length !== n; })) fail(`${tag} 不该人点的时候点上了`);
      if (rule === 'ss8' && first === 'me') {
        await p.waitForTimeout(200);
        if (await p.evaluate(() => { humanPlay(0); return S.moves.length !== 1; })) fail(`${tag} 第 2 手摆到了离天元很远的地方`);
      }
      const seen = await drive(tag, prefer);
      await settle();
      const r = await after(tag);
      if (r.op || r.card) fail(`${tag} 开局走完了卡还在`);
      const need = rule.startsWith('swap') ? 3 : 5;
      if (r.n < need) fail(`${tag} 走完开局只有 ${r.n} 手`);
      if ((r.n % 2 === 0 ? 1 : 2) !== r.human && !r.over) fail(`${tag} 走完开局没轮到人：` + JSON.stringify(r));
      if (['ss8', 'rif', 'yama'].includes(rule) && !seen.includes('offer') && !seen.includes('pick')) fail(`${tag} 没经过打点`);
      if (rule === 'tara' && !seen.includes('tmove') && !seen.includes('tswap')) fail(`${tag} 没经过塔拉古奇的步骤`);
      console.log(tag, '步骤', seen.join('→'), '· 手数', r.n, '· 你执', r.human === 1 ? '黑' : '白');
      if (rule === 'ss8' && first === 'me') await p.screenshot({ path: `op_done_${w}.png` });
      // 走完开局：说清楚谁执黑；悔棋悔不进开局里
      const note = await p.evaluate(() => ({ line: document.getElementById('threat')?.textContent || '', card: document.getElementById('introVs')?.textContent || '', note: S.opNote && S.opNote.text }));
      if (!/开局结束/.test(note.card) || !/开局结束/.test(note.note || '')) fail(`${tag} 开局走完没说谁执黑：` + JSON.stringify(note));
      else console.log('  ', note.note);
      if (rule === 'swap2' && first === 'me' && w === 1440) await p.screenshot({ path: 'op_swap2_done.png' });
      const pn = await p.evaluate(() => S.presetN);
      if (pn < need || pn > r.n) fail(`${tag} 开局的几手没定下来（presetN=${pn}）`);
      await p.evaluate(async () => { for (const i of [0, 14, 210, 224, 1, 13]) { if (S.moves.includes(i)) continue; humanPlay(i); break; } for (let k = 0; k < 60 && (S.thinking || !myTurn()); k++) await new Promise(r => setTimeout(r, 200)); });
      for (let k = 0; k < 4; k++) await p.evaluate(() => undoMove());
      const u = await p.evaluate(() => ({ n: S.moves.length, op: S.op, off: document.getElementById('btnUndo').disabled, human: S.human }));
      if (u.n !== r.n || u.op || !u.off || u.human !== r.human) fail(`${tag} 悔棋悔进了开局：` + JSON.stringify(u) + ' 开局手数 ' + r.n);
    }
    // 规则预设：棋规和开局规则一起换
    await p.evaluate(async () => { S.openRule = 'free'; S.rule = 'renju'; newGame(); applyRuleset('gwc'); newGame(); });
    await p.waitForTimeout(300);
    if (JSON.stringify(await p.evaluate(() => [S.rule, S.openRule])) !== '["std","swap2"]') fail(`${w} 选五子棋世锦赛规则后棋规不对`);
    await p.evaluate(async () => { applyRuleset('rwc'); newGame(); });
    await p.waitForTimeout(300);
    if (JSON.stringify(await p.evaluate(() => [S.rule, S.openRule])) !== '["renju","ss8"]') fail(`${w} 选连珠世锦赛规则后棋规不对`);
    // 人机对弈设置页：分组选规则；选了带开局规则的，执子换成开局顺序
    if (w === 1440) {
      await p.evaluate(() => go('setup')); await p.waitForTimeout(500);
      await p.evaluate(() => { setupSel.ruleSet = 'gwc'; }); await p.waitForTimeout(200);
      const su = await p.evaluate(() => ({ sel: setupSel.ruleSet, sub: $('suStartSub').textContent, hf: !!$('suHideForbRow'), desc: $('suDesc').textContent, order: document.body.textContent.includes('开局顺序') }));
      if (su.sel !== 'gwc' || !/Swap2/.test(su.sub) || su.hf || !/标准五子棋/.test(su.desc) || !su.order) fail('设置页选规则不对：' + JSON.stringify(su));
      await p.screenshot({ path: 'op_setup_rules.png' });
      await p.click('#suGroup .segm-i:first-child'); await p.waitForTimeout(200); await p.click('#su-renju'); await p.waitForTimeout(200);
      if (!(await p.$('#suHideForbRow'))) fail('选连珠后没有「隐藏禁手点」');
      await p.evaluate(() => showView('game')); await p.waitForTimeout(300);
    }
    // 标准五子棋：长连不算胜，恰好五子才算
    const std = await p.evaluate(() => {
      S.mode = 'pvp'; S.nigiri = false; applyRuleset('gwc'); newGame();
      loadGame([32, 0, 33, 1, 34, 2, 36, 4, 37, 6]);          // 黑 C3 D3 E3 G3 H3（第 3 行，缺 F3）
      humanPlay(35);                                           // 黑 F3：六子长连
      const over1 = S.over;
      loadGame([32, 0, 33, 1, 34, 2, 36, 4, 150]); humanPlay(8); humanPlay(35);   // 黑 C3–G3 恰好五子
      return { over1, over2: S.over, winner: S.winner, code: encodeGame()[0] };
    });
    if (std.over1 || !std.over2 || std.winner !== 1 || std.code !== 'S') fail('标准五子棋胜负判定不对：' + JSON.stringify(std));
    await p.evaluate(() => { S.mode = 'ai'; applyRuleset('renju'); });
    // Pro：黑方第 3 手须离天元 3 路以上（人下时拦住，对手下时也遵守）
    const pro = await p.evaluate(async () => {
      S.mode = 'ai'; S.level = 'chong.hard'; applyRuleset('pro'); S.side = 2; newGame();
      for (let k = 0; k < 40 && (S.thinking || !myTurn()); k++) await new Promise(r => setTimeout(r, 200));
      const first = S.moves[0]; humanPlay(first + 1);
      for (let k = 0; k < 60 && (S.thinking || !myTurn()); k++) await new Promise(r => setTimeout(r, 200));
      const third = S.moves[2], d = Math.max(Math.abs(third % 15 - 7), Math.abs(((third / 15) | 0) - 7));
      S.side = 1; newGame(); humanPlay(0); const rej1 = S.moves.length === 0; humanPlay(112);
      for (let k = 0; k < 60 && (S.thinking || !myTurn()); k++) await new Promise(r => setTimeout(r, 200));
      const n0 = S.moves.length, near = [96, 97, 98, 111, 113, 126, 127, 128, 82, 142].find(i => !S.moves.includes(i)); humanPlay(near);
      const rej3 = S.moves.length === n0;
      return { first, d, rej1, rej3, rule: S.rule, away: AWAY };
    });
    if (pro.first !== 112 || pro.d < 3 || !pro.rej1 || !pro.rej3 || pro.rule !== 'std' || pro.away !== 3) fail(`${w} Pro 规则不对：` + JSON.stringify(pro));
    await p.evaluate(() => { applyRuleset('renju'); newGame(); });
    // 执子设置不被开局规则改掉：换回自由开局，照设置执黑
    await p.evaluate(() => { S.openRule = 'free'; newGame(); });
    if ((await p.evaluate(() => S.human)) !== 1) fail(`${w} 换回自由开局后执子不是设置里的执黑`);

    // 双人对弈：猜先定甲，然后 Swap2
    await p.evaluate(() => { S.mode = 'pvp'; S.nigiri = true; S.openRule = 'swap2'; newGame(); });
    await p.waitForTimeout(300);
    if (!(await p.$('#nigiri'))) fail(`${w} 双人 + 开局规则没先猜先`);
    const ngTxt = await p.$eval('#nigiri', e => e.textContent);
    if (!/先摆/.test(ngTxt)) fail(`${w} 猜先卡没说猜中的先摆`);
    await p.click('#ngEven'); await p.waitForTimeout(300); await p.click('#ngGo'); await p.waitForTimeout(200);
    if (!(await p.evaluate(() => S.op && S.op.step === 'place3'))) fail(`${w} 猜完先没进入 Swap2`);
    // 摆了两颗时刷新：接着摆
    await p.evaluate(() => { humanPlay(112); humanPlay(97); });
    await p.reload(); await p.waitForTimeout(900); await p.evaluate(() => showView('game')); await p.waitForTimeout(300);
    const rs = await p.evaluate(() => ({ op: S.op && S.op.step, n: S.moves.length, card: !!document.getElementById('opening') }));
    if (rs.op !== 'place3' || rs.n !== 2 || !rs.card) fail(`${w} 刷新后开局没接上：` + JSON.stringify(rs));
    const seenP = await drive(`${w} 双人 swap2`, { choose: 'op-more', choose2: 'op-white' });
    const rp = await after();
    if (rp.op || rp.n !== 5) fail(`${w} 双人 swap2 结果不对：` + JSON.stringify(rp));
    console.log(`${w} 双人`, seenP.join('→'));
    await p.evaluate(() => humanPlay(20)); if ((await p.evaluate(() => S.moves.length)) !== 6) fail(`${w} 双人开局后不能落子`);
    await p.evaluate(() => { S.openRule = 'free'; S.nigiri = false; newGame(); });
    await ctx.close();
  }
  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
