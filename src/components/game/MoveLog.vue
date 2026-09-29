<script setup>
/* 本局棋谱：两手一行，点一手进复盘。下棋时滚到最后，复盘时把当前这手滚到中间 */
import { computed, ref, watch, nextTick } from 'vue';
import { ui } from '../../stores/ui.js';
import { S } from '../../ui/state.js';
import { logRows } from '../../game/view.js';
import { enterReview } from '../../game/review.js';

const props = defineProps({ center: Boolean });     // center：复盘时把当前手滚到中间（左栏那份）
const emit = defineEmits(['pick']);
const el = ref(null);
const rows = computed(() => { return ui.booted ? logRows() : []; });

watch(rows, async () => {
  await nextTick();
  const e = el.value; if (!e) return;
  if (S.review < 0) e.scrollTop = e.scrollHeight;
  else if (props.center) { const cur = e.querySelector('span.cur'); if (cur) e.scrollTop = cur.offsetTop - e.clientHeight / 2; }
});
function pick(k) { enterReview(k + 1); emit('pick', k); }
</script>

<template>
  <div ref="el" class="log">
    <table v-if="rows.length"><tbody><tr v-for="r in rows" :key="r.no" :class="r.last ? 'last' : undefined"><td>{{ r.no }}.</td><td v-for="(x, j) in [r.a, r.b]" :key="j"><span v-if="x" :data-k="x.k" :class="x.cur ? 'cur' : undefined" @click="pick(x.k)">{{ x.sym + ' ' + x.c + (x.tag ? ' ' : '') }}<i v-if="x.tag">{{ x.tag }}</i></span></td></tr></tbody></table>
    <div v-else class="empty">还没有落子。黑棋通常先下天元 H8。</div>
  </div>
</template>
