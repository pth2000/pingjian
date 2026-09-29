// 剧情只有三样：交情、各人的故事（知己以后每两盘一步，互不等待）、最后一步（做朋友 / 说出心意，只看模样）；旧存档
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 860 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('gomoku-profiles')) localStorage.setItem('gomoku-profiles', JSON.stringify({ list: [{ id: 'pb', name: '阿岚', t: Date.now() }], cur: 'pb' })); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(BASE); await p.waitForTimeout(600);
  const layer = () => p.evaluate(() => ui.layer.kind);
  // 和某人下一盘（走真实的结算）；返回这盘之后要演的那一段，故事演完收起
  const sim = (opp, out = 'win', show = true) => p.evaluate(([opp, out, show]) => {
    const r = dbgGame(opp, out); const ev = r && r.ev;
    if (ev && show) { showEvent(ev); if (ev.kind !== 'final') stClose(); }
    return { ev: ev ? ev.kind + (ev.i ?? '') : '', line: r && r.line };
  }, [opp, out, show]);

  /* ---- 知己以前：什么也不演 ---- */
  await p.evaluate(() => { dbgSetCnt('xieyue', 13); stSave(); });
  // 札记：没到知己，故事的标题不露出来；下一步的条件写明还差几盘
  await p.evaluate(() => { NT.sel = 'xieyue'; showView('notes'); }); await p.waitForTimeout(400);
  const pre0 = await p.evaluate(() => ({ h: document.querySelector('.np-story h4').textContent, lock: document.querySelector('.np-story').textContent, next: document.querySelector('.np-bb')?.textContent || '', title: STORY.xieyue.arc.title }));
  ok(!pre0.h.includes(pre0.title) && /还差 7 盘/.test(pre0.lock) && /距「知己」还差 7 盘/.test(pre0.next), '知己以前不露故事标题，条件写明 ' + JSON.stringify(pre0));
  // 剧情模式关闭：玩家头像换成称呼首字，札记不显示
  await p.evaluate(() => { ST.on = false; showView('profile'); }); await p.waitForTimeout(300);
  const off = await p.evaluate(() => ({ plain: !!document.querySelector('.pf-face .player-plain'), label: document.getElementById('pfStory')?.closest('.card')?.textContent || '' }));
  ok(off.plain && /剧情模式/.test(off.label), '关闭剧情：头像简化、开关叫剧情模式 ' + JSON.stringify(off));
  await p.screenshot({ path: 'story_off_profile.png' });
  await p.evaluate(() => { ST.on = true; showView('home'); });
  const pre = []; for (let k = 0; k < 7; k++) pre.push((await sim('xieyue')).ev || '-');
  ok(pre.every(x => x === '-') && await p.evaluate(() => stageOf('xieyue')) === 4, '到知己之前没有故事 ' + pre.join(' '));

  /* ---- 斜月的故事：知己以后每两盘一步，五步走完，不等别人（如影还不认识） ---- */
  const seq = []; for (let k = 0; k < 10; k++) seq.push((await sim('xieyue')).ev || '-');
  console.log('斜月', seq.join(' '));
  ok(seq.join(' ') === '- arc0 - arc1 - arc2 - arc3 - arc4', '每两盘一步，不等别人 ' + seq.join(' '));
  ok(await p.evaluate(() => arcOf('xieyue') === 5 && !stageOf('atu')), '五步走完，如影还不认识');
  await p.evaluate(() => { NT.sel = 'xieyue'; showView('notes'); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelector('.np-story').textContent.includes('故事已全部讲完')), '札记：故事讲完了，再对弈 1 盘迎来最后一步');
  await p.evaluate(() => replayTale({ id: 'xieyue', i: 2 })); await p.waitForTimeout(250);
  ok(await layer() === 'tale', '札记里能再看一步');
  await p.screenshot({ path: 'sb_arc.png' });
  await p.evaluate(() => { stClose(); NT.sel = null; showView('home'); });

  /* ---- 最后一步：男性玩家和斜月，可以说出心意 ---- */
  const f1 = await sim('xieyue', 'win', false);
  ok(f1.ev === 'final', '故事走完再下一盘：最后一步 ' + f1.ev);
  await p.evaluate(() => showEvent({ kind: 'final', id: 'xieyue' })); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !!document.querySelector('[data-bond="romance"]')), '异性：能说出心意');
  ok(await p.evaluate(() => document.querySelector('[data-bond="friend"]').textContent.trim()) === '给曲子起个名字', '做朋友的那个选项写的是事');
  await p.screenshot({ path: 'sb_final.png' });
  await p.click('[data-bond="romance"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => ST.bond.xieyue === 'love' && stageName('xieyue') === '情意'), '说出心意：情意');
  await p.evaluate(() => stClose());
  const after = []; for (let k = 0; k < 6; k++) after.push((await sim('xieyue')).ev || '-');
  ok(after.every(x => x === '-'), '选定了以后不再演 ' + after.join(' '));

  /* ---- 磐石（男性玩家）：只能做兄弟 ---- */
  await p.evaluate(() => { dbgSetCnt('laogui', 20); ST.arc.laogui = 5; ST.arcN.laogui = 20; });
  ok((await sim('laogui', 'win', false)).ev === 'final', '磐石的最后一步');
  await p.evaluate(() => showEvent({ kind: 'final', id: 'laogui' })); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.querySelector('[data-bond="romance"]')), '同性（非特殊线）：只能做朋友');
  await p.click('[data-bond="friend"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => ST.bond.laogui === 'friend' && stageName('laogui') === '兄弟'), '成了兄弟');
  await p.evaluate(() => stClose());

  /* ---- 女性玩家 ---- */
  const fem = await p.evaluate(() => { PROFILE.set('g', 'f'); return ['atu', 'chong', 'xieyue', 'laogui', 'wuming', 'yehu'].map(romanceKind); });
  ok(fem.join() === 'special,special,special,love,,love', '女性玩家：如影、惊雷、斜月 special，磐石、飞鸿 love，守中没有 ' + fem);
  await p.evaluate(() => { dbgSetCnt('atu', 20); ST.arc.atu = 5; ST.arcN.atu = 20; showEvent({ kind: 'final', id: 'atu' }); }); await p.waitForTimeout(200);
  await p.click('[data-bond="romance"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => ST.bond.atu === 'special' && stageName('atu') === '长明'), '如影：长明');
  await p.screenshot({ path: 'sb_special.png' });
  await p.evaluate(() => { stClose(); PROFILE.set('g', 'm'); });

  /* ---- 守中：只做忘年之交 ---- */
  await p.evaluate(() => { dbgSetCnt('wuming', 20); ST.arc.wuming = 5; ST.arcN.wuming = 20; showEvent({ kind: 'final', id: 'wuming' }); }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.querySelector('[data-bond="romance"]')), '守中没有说出心意');
  await p.click('[data-bond="friend"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => stageName('wuming')) === '忘年之交', '守中：忘年之交');
  await p.evaluate(() => stClose());

  /* ---- 札记 ---- */
  await p.evaluate(() => { NT.sel = null; showView('notes'); }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelectorAll('.nt-heart').length === 4 && !document.body.textContent.includes('纸条')), '札记：四个羁绊，没有纸条');
  await p.screenshot({ path: 'sb_notes.png', fullPage: true });
  await p.evaluate(() => { NT.sel = 'xieyue'; }); await p.waitForTimeout(300);
  await p.screenshot({ path: 'sb_person.png', fullPage: true });
  await p.click('#npHeart'); await p.waitForTimeout(250);
  ok(await layer() === 'bond', '札记里能再看那天');
  await p.evaluate(() => { stClose(); NT.sel = null; showView('profile'); }); await p.waitForTimeout(300);
  await p.screenshot({ path: 'sb_profile.png', fullPage: true });

  /* ---- 旧存档：心意 → 羁绊；纸条、日子、老馆主这些字段都去掉 ---- */
  const key = await p.evaluate(() => Object.keys(localStorage).find(k => /story$/.test(k)));
  await p.evaluate(key => { localStorage.setItem(key, JSON.stringify({ cnt: { wuming: 25, atu: 3 }, stage: { wuming: 5, atu: 1 }, total: 28, notes: [{ w: 'wuming', i: 0, t: 1, n: 10 }], heart: 'wuming', heartT: 123, on: true, got: [], noteIdx: { wuming: 1 }, heard: {}, meet: {}, lastT: {}, best: {}, last: { opp: null, run: 0 }, relic: { has: true }, lp: {}, main: { ch: 2 }, clash: [], notePending: null, freshN: 2 })); }, key);
  await p.reload(); await p.waitForTimeout(700);
  ok(await p.evaluate(() => ST.bond.wuming === 'friend' && ['heart', 'relic', 'notes', 'lp', 'main', 'clash', 'notePending', 'freshN'].every(k => !(k in ST)) && arcOf('wuming') === 5 && stageName('wuming') === '忘年之交'), '旧存档：守中的心意成了忘年之交，旧字段都去掉了');

  console.log(errs); await b.close(); if (errs.length) process.exitCode = 1;
})();
