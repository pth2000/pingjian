<script setup>
/* 札记：总览（羁绊、六位熟客的卡片）和人物页（点开一位）。
   现在看的是谁记在 story.js 的 NT.sel 里：点 data-nt 的按钮时由 story.js 的点击处理设好。 */
import PageHeader from '../components/PageHeader.vue';
import { go, setupWith } from '../ui/views.js';
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { LINE_KIND, ST, allLines, bondBar, fmtDay, heardLines, personCount, stFill, stageName, stageOf } from '../story/story.js';
import { arcLeft, arcOf, bondName, isLove, replayBond, replayTale } from '../story/bonds.js';
import { oppArt, oppFace, oppKnown, oppSeal } from '../story/portraits.js';
import { DIFFS, OPPONENTS } from '../engine/engine.js';
import { DIFF_NAME, OPP, OPP_COL, REC } from '../ui/state.js';
import { FACT_AT, STAGES, STORY } from '../story/story-data.js';
import { NT } from '../story/story.js';



// 剧情往下走的条件：交情只看累计对弈盘数；到了知己，每再下几盘讲一段故事；讲完再下一盘是最后一步
function nextStep(id) {
  const st = stageOf(id), c = ST.cnt[id] || 0, d = STORY[id];
  if (ST.bond[id] || !d) return '';
  if (st < 4) return `距「${STAGES[st + 1].k}」还差 ${STAGES[st + 1].n - c} 盘`;
  const k = arcOf(id), n = d.arc.steps.length;
  if (k < n) return `再对弈 ${arcLeft(id)} 盘，讲述故事第 ${k + 1} 段（共 ${n} 段）`;
  return '再对弈 1 盘，迎来最后一步';
}
// 锁着的条目：到哪一段交情（累计多少盘）解锁，还差几盘
function lockText(id, n) {
  const c = ST.cnt[id] || 0, need = STAGES[n].n;
  return `交情到「${STAGES[n].k}」（累计对弈 ${need} 盘）后解锁` + (need > c ? `，还差 ${need - c} 盘` : '');
}
const v = computed(() => {
  if (!ui.booted) return {};
  if (!ST.on) return { off: true };
  if (NT.sel && oppKnown(NT.sel)) return { person: personView(NT.sel) };
  return { all: overview() };
});

function overview() {
  const known = OPPONENTS.filter(o => oppKnown(o.id));
  let got = 0; OPPONENTS.forEach(o => { got += personCount(o.id).got; });
  const bonds = OPPONENTS.filter(o => ST.bond[o.id]).sort((a, b) => ST.bondT[a.id] - ST.bondT[b.id])
    .map(o => ({ id: o.id, col: OPP_COL[o.id], face: oppFace(o.id), name: o.name, love: isLove(o.id), sub: [bondName(o.id), fmtDay(ST.bondT[o.id])].filter(Boolean).join(' · ') }));
  const cast = OPPONENTS.map(o => {
    const c = ST.cnt[o.id] || 0;
    if (!oppKnown(o.id)) return { id: o.id, unk: true, col: OPP_COL[o.id], seal: oppSeal(o.id), name: o.name, sub: c ? `再对弈 ${STAGES[1].n - c} 盘即可结识` : `尚未对弈 · 对弈满 ${STAGES[1].n} 盘即可结识` };
    const pc = personCount(o.id);
    return { id: o.id, col: OPP_COL[o.id], heart: stageOf(o.id) >= 5, full: oppArt(o.id, 'f'), face: oppFace(o.id), name: o.name, stage: stageName(o.id), title: STORY[o.id].title,
      p: (pc.got / pc.all * 100).toFixed(0), got: `记下 ${pc.got}/${pc.all}`, next: nextStep(o.id) };
  });
  const tales = OPPONENTS.reduce((a, o) => a + arcOf(o.id), 0);
  return { known: known.length, total: OPPONENTS.length, got, tales, bonds, cast };
}

function personView(id) {
  const o = OPP[id], d = STORY[id], st = stageOf(id), s = Math.min(st, 4), c = ST.cnt[id] || 0, pc = personCount(id);
  let w = 0, l = 0, dr = 0;
  const rows = DIFFS.map(k => { const r = REC[id + '.' + k] || {}; w += r.w || 0; l += r.l || 0; dr += r.d || 0; return { name: DIFF_NAME[k], w: r.w || 0, l: r.l || 0, d: r.d || 0, any: !!(r.w || r.l || r.d) }; }).filter(r => r.any);
  const b = ST.best[id] || {};
  const heard = heardLines(id);
  return {
    id, col: OPP_COL[id], heart: st >= 5, full: oppArt(id, 'f'), face: oppFace(id),
    title: d.title, name: o.name, motto: stFill(d.motto, id), stage: stageName(id), bond: bondBar(id),
    meta: [ST.meet[id] ? `初见 ${fmtDay(ST.meet[id])}` : '', `下过 ${c} 盘`, ST.lastT[id] ? `上回 ${fmtDay(ST.lastT[id])}` : ''].filter(Boolean).join(' · '),
    pc, lore: stFill(d.lore, id), style: d.style,
    facts: d.facts.map(([k, val], i) => s >= FACT_AT[i] ? { k, v: stFill(val, id) } : { lock: lockText(id, FACT_AT[i]) }), factsN: d.facts.length,
    worries: d.worries.map((t, k) => k < s ? { t: stFill(t, id) } : { lock: lockText(id, k + 1) }), worriesN: d.worries.length,
    next: st >= 4 ? nextStep(id) : '',          // 知己以前，交情条已写明还差几盘
    quotes: heard.map(x => ({ t: stFill(x.t, id), kind: LINE_KIND[x.kind] })), linesN: allLines(id).length,
    w, l, dr, rows,
    bests: [b.long ? `最长一盘 <b>${b.long}</b> 手` : '', b.fast ? `最快一胜 <b>${b.fast}</b> 手` : ''].filter(Boolean).join('<i>·</i>'),
    story: storyView(id, st),
    mine: ST.bond[id] ? { bond: bondName(id), day: fmtDay(ST.bondT[id]) } : null,
  };
}
// TA 的故事：走过的几步，下一步
function storyView(id, st) {
  const d = STORY[id], a = d.arc, k = arcOf(id), n = a.steps.length;
  const ta = d.gender === 'f' ? '她' : '他', open = st >= 4 || !!ST.bond[id], c = ST.cnt[id] || 0;
  return {
    // 没到知己之前，故事的标题也不露出来
    title: open ? a.title : `${ta}的故事`, k, n,
    locked: open ? '' : `交情到「知己」（累计对弈 ${STAGES[4].n} 盘）后，${ta}会开始讲述自己的故事，共 ${n} 段。还差 ${STAGES[4].n - c} 盘。`,
    steps: a.steps.map((x, i) => i < k ? { i, title: x.title, sum: stFill(x.sum, id) } : i === k && st === 4 ? { next: `再对弈 ${arcLeft(id)} 盘，${ta}会讲述第 ${k + 1} 段。` } : { lock: true }),
    last: k >= n && !ST.bond[id] ? `故事已全部讲完。再与${ta}对弈 1 盘，迎来最后一步。` : '',
  };
}
</script>

<template>
  <section class="view v-notes page" data-v="notes" aria-label="札记">
    <!-- 人物页里，返回键改成回札记总览 -->
    <PageHeader :title="v.person ? '' : '札记'" :sub="v.person ? '' : '熟客们的事，和他们自己的故事'" :back="v.person ? '札记' : ''" @back="go('notes')"/>
    <div id="ntBody">
      <p v-if="v.off" class="nt-empty nt-off">剧情模式已关闭，札记暂不显示。<button type="button" class="linkish" @click="go('profile')">在「我的」中开启 ›</button></p>

      <template v-else-if="v.all">
        <section class="nt-sum"><span><b>{{ v.all.known }}</b>/ {{ v.all.total }}<small>认识的人</small></span><span><b>{{ v.all.got }}</b><small>记下的事</small></span><span><b>{{ v.all.tales }}</b><small>听过的故事</small></span></section>
        <section v-if="v.all.bonds.length" class="nt-sec"><h4>羁绊</h4><div class="nt-bonds"><button v-for="b in v.all.bonds" :key="b.id" type="button" class="nt-heart" :class="{ love: b.love }" :data-bond-replay="b.id" :style="{ '--oc': b.col }" @click="replayBond(b.id)"><span class="pf-bf" v-html="b.face"></span><span><b>{{ b.name }}</b><small>{{ b.sub }}</small></span><em>再看一遍 ›</em></button></div></section>
        <section class="nt-sec"><h4>熟客<small>{{ v.all.known ? '点开查看记下的事' : '与同一位对弈满 2 盘即可结识' }}</small></h4><div class="nt-cast">
          <template v-for="c in v.all.cast" :key="c.id">
            <div v-if="c.unk" class="nt-c unk" :style="{ '--oc': c.col }"><span class="nt-cf" v-html="c.seal"></span><b>{{ c.name }}</b><small>{{ c.sub }}</small></div>
            <button v-else type="button" class="nt-c" :class="{ heart: c.heart, 'has-full': !!c.full }" :data-nt="c.id" :style="{ '--oc': c.col }"><span v-if="c.full" class="nt-cfull"><img :src="c.full" alt="" draggable="false"></span><span class="nt-cf" v-html="c.face"></span>
              <b>{{ c.name }}</b><em>{{ c.stage }}</em><small>{{ c.title }}</small>
              <span class="nt-cp"><span class="bb"><i :style="{ '--p': c.p + '%' }"></i></span><small>{{ c.got }}</small></span><small v-if="c.next" class="nt-next">{{ c.next }}</small></button>
          </template>
        </div></section>
      </template>

      <template v-else-if="v.person">
        <section class="np-hero" :class="{ 'has-full': !!v.person.full, heart: v.person.heart }" :style="{ '--oc': v.person.col }">
          <span v-if="v.person.full" class="np-full"><img :src="v.person.full" alt="" draggable="false"></span><span v-else class="np-face" v-html="v.person.face"></span>
          <div class="np-id"><small class="np-k">{{ v.person.title }}</small><h3>{{ v.person.name }}</h3><p class="np-motto">「<span v-html="v.person.motto"></span>」</p>
            <div class="np-bond"><span class="np-st">{{ v.person.stage }}</span><span class="np-bb" v-html="v.person.bond"></span></div>
            <p class="np-meta">{{ v.person.meta }}</p><p v-if="v.person.next" class="np-next"><b>下一步</b>{{ v.person.next }}</p><p class="np-got">札记里记下 <b>{{ v.person.pc.got }}</b> / {{ v.person.pc.all }} 件事</p>
            <button type="button" class="btn sm np-play" id="npPlay" @click="setupWith(v.person.id)">和 {{ v.person.name }} 下一盘 ›</button></div>
        </section>
        <div class="np-grid" :style="{ '--oc': v.person.col }">
          <section class="np-box np-lore"><h4>来历</h4><p v-html="v.person.lore"></p><p class="np-style"><b>棋路</b>{{ v.person.style }}</p></section>
          <section class="np-box"><h4>小档案<small>{{ v.person.pc.facts }}/{{ v.person.factsN }}</small></h4><dl class="np-fs">
            <template v-for="(f, i) in v.person.facts" :key="i">
              <div v-if="f.lock" class="np-f lock"><dt>？</dt><dd>{{ f.lock }}</dd></div>
              <div v-else class="np-f"><dt>{{ f.k }}</dt><dd v-html="f.v"></dd></div>
            </template></dl></section>
          <section class="np-box"><h4>心事<small>{{ v.person.pc.worries }}/{{ v.person.worriesN }}</small></h4><ol class="np-w">
            <template v-for="(w, i) in v.person.worries" :key="i"><li v-if="w.lock" class="lock">{{ w.lock }}</li><li v-else v-html="w.t"></li></template></ol></section>
          <section class="np-box np-story"><h4>{{ v.person.story.title }}<small>{{ v.person.story.k }}/{{ v.person.story.n }}</small></h4>
            <p v-if="v.person.story.locked" class="nt-empty">{{ v.person.story.locked }}</p>
            <ol v-else class="nt-tale">
              <template v-for="(x, i) in v.person.story.steps" :key="i">
                <li v-if="x.title"><button type="button" class="nt-tb" :data-arc="i" @click="replayTale({ id: v.person.id, i })"><span><b>{{ x.title }}</b><small v-html="x.sum"></small></span></button></li>
                <li v-else-if="x.next" class="lock" v-html="x.next"></li>
                <li v-else class="lock">……</li>
              </template>
            </ol>
            <p v-if="v.person.story.last" class="np-knot"><b>下一步</b>{{ ' ' }}{{ v.person.story.last }}</p></section>
          <section class="np-box"><h4>听过的话<small>{{ v.person.quotes.length }}/{{ v.person.linesN }}</small></h4>
            <ul v-if="v.person.quotes.length" class="np-q"><li v-for="(q, i) in v.person.quotes" :key="i"><q v-html="q.t"></q><small>{{ q.kind }}</small></li></ul>
            <p v-else class="nt-empty">还没听 TA 说过什么。</p>
            <p class="np-hint">交情越深，TA 说的话越不一样；你的下法，有时也会让 TA 多说一句。</p></section>
          <section class="np-box"><h4>交手</h4>
            <div class="np-rec"><span><b>{{ v.person.w }}</b>胜</span><span><b>{{ v.person.l }}</b>负</span><span><b>{{ v.person.dr }}</b>和</span></div>
            <p v-if="v.person.bests" class="np-best" v-html="v.person.bests"></p>
            <table v-if="v.person.rows.length" class="np-t"><tbody><tr><th></th><td>胜</td><td>负</td><td>和</td></tr>
              <tr v-for="r in v.person.rows" :key="r.name"><th>{{ r.name }}</th><td>{{ r.w }}</td><td>{{ r.l }}</td><td>{{ r.d }}</td></tr></tbody></table></section>
          <section v-if="v.person.mine" class="np-box np-heart"><h4>{{ v.person.mine.bond }}<small>{{ v.person.mine.day }}</small></h4><p>故事走完的那天，你们成了{{ v.person.mine.bond }}。</p>
            <button type="button" class="linkish" id="npHeart" @click="replayBond(v.person.id)">再看一遍那天 ›</button></section>
        </div>
      </template>
    </div>
  </section>
</template>
