<script setup>
/* 成就页：总进度、铜银金三档各几个，再按分类列出每一枚印章 */
import PageHeader from '../components/PageHeader.vue';
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { ACH, ACHS, ACH_CAT, ACH_TIER } from '../features/achievements.js';
import { fmtDay } from '../story/story.js';

const v = computed(() => {
  if (!ui.booted) return null;
  const fresh = ui.achFresh;
  const n = ACHS.filter(a => ACH.got[a.id]).length;
  return {
    n, all: ACHS.length, p: (n / ACHS.length * 100).toFixed(1) + '%',
    tiers: [3, 2, 1].map(t => ({ t, name: ACH_TIER[t], got: ACHS.filter(a => a.t === t && ACH.got[a.id]).length, all: ACHS.filter(a => a.t === t).length })),
    groups: ACH_CAT.map(cat => {
      const list = ACHS.filter(a => a.cat === cat);
      return {
        cat, got: list.filter(a => ACH.got[a.id]).length, all: list.length,
        items: list.map(a => {
          const got = ACH.got[a.id], hide = a.hidden && !got;
          return { id: a.id, t: a.t, got: !!got, fresh: fresh.has(a.id), g: hide ? '?' : a.g, name: hide ? '隐藏成就' : a.name, desc: hide ? '达成之后才揭晓。' : a.desc, day: got ? fmtDay(got) : '' };
        }),
      };
    }),
  };
});
</script>

<template>
  <section class="view v-ach page" data-v="ach" aria-label="成就">
    <PageHeader title="成就" :sub="`胜负、对手、规则、妙手、定式、杀法，一共 ${ACHS.length} 枚印章`"/>
    <div id="achBody"><template v-if="v">
      <div class="ach-sum"><div class="ach-bar"><b>{{ v.n }}</b><span>/ {{ v.all }}</span><i :style="{ '--p': v.p }"></i></div>
        <div class="ach-tiers"><span v-for="x in v.tiers" :key="x.t" :class="'t' + x.t"><em class="ach-seal sm">{{ x.name }}</em>{{ x.got }} / {{ x.all }}</span></div></div>
      <section v-for="g in v.groups" :key="g.cat" class="ach-grp"><h3>{{ g.cat }}<small>{{ g.got }} / {{ g.all }}</small></h3><div class="ach-grid">
        <div v-for="a in g.items" :key="a.id" class="ach-card" :class="[a.got ? 'got t' + a.t : '', { fresh: a.fresh }]"><span class="ach-seal">{{ a.g }}</span>
          <span class="at"><b>{{ a.name }}</b><span>{{ a.desc }}</span><small v-if="a.got">{{ a.day }} 获得</small></span><i v-if="a.fresh" class="ach-new">新</i></div>
      </div></section>
    </template></div>
  </section>
</template>
