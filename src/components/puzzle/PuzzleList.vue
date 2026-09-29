<script setup>
/* 杀法题目列表：入门、进阶、挑战三档，颜色标出解开过的 */
import { computed, ref, watch, nextTick } from 'vue';
import { ui } from '../../stores/ui.js';
import { PZ } from '../../puzzles/puzzles.js';
import { pzListView } from '../../puzzles/view.js';
import { pzOpen } from '../../puzzles/puzzles.js';

const el = ref(null);
const v = computed(() => { return ui.booted ? pzListView() : null; });
watch(() => PZ.k, async () => {
  await nextTick();
  const L = el.value, on = L && L.querySelector('.pz-t.on');
  if (on) requestAnimationFrame(() => { L.scrollLeft = on.offsetLeft - L.clientWidth / 2 + on.offsetWidth / 2; if (L.scrollHeight > L.clientHeight) L.scrollTop = on.offsetTop - L.clientHeight / 2; });
});
</script>

<template>
  <div ref="el" class="bk-list pz-list" id="pzList" role="group" aria-label="选择题目"><template v-if="v"><div class="pz-prog"><b>{{ v.done }}</b> / {{ v.total }} 题<small>{{ v.perfect ? `一次解开 ${v.perfect} 题` : '从入门开始吧' }}</small></div><div v-for="lv in v.levels" :key="lv.name" class="bs-grp"><span class="bs-k">{{ lv.name }}</span><button v-for="x in lv.items" :key="x.k" type="button" class="pz-t" :class="[x.g, { on: x.on }]" :data-k="x.k" :aria-pressed="String(x.on)" :title="x.title" @click="pzOpen(x.k)">{{ x.k + 1 }}</button></div><div class="bs-legend pz-legend" aria-hidden="true"><span><i class="pz-t perfect"></i>一次解开</span><span><i class="pz-t done"></i>解开了</span><span><i class="pz-t seen"></i>看过答案</span></div></template></div>
</template>
