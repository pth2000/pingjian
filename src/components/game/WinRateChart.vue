<script setup>
/* 数据页的胜率走势图：鼠标移上去看每一手后的胜率，点一下进复盘 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { S } from '../../ui/state.js';
import { wrSeries, wrChartSvg } from '../../game/view.js';
import { enterReview } from '../../game/review.js';

const box = ref(null), W = ref(240), H = ref(74);
let ro = null;
onMounted(() => {
  const measure = () => { W.value = box.value.clientWidth || 240; H.value = box.value.clientHeight || 74; };
  ro = new ResizeObserver(measure); ro.observe(box.value); measure();
});
onBeforeUnmount(() => ro && ro.disconnect());

const v = computed(() => {
  if (!ui.booted) return null;
  const ser = wrSeries();
  return { show: S.showWR, n: ser.length - 1, ...wrChartSvg(ser, W.value, H.value, gv.wrHover) };
});
function pick(e) {
  const r = box.value.getBoundingClientRect(), n = S.moves.length;
  gv.wrHover = n ? Math.round(Math.max(0, Math.min(1, (e.clientX - r.left - 5) / (r.width - 10))) * n) : 0;
}
function down(e) { pick(e); if (S.moves.length) enterReview(gv.wrHover); }
</script>

<template>
  <div class="wr" id="wrTrend" :hidden="v && !v.show">
    <p class="wr-cap">黑棋胜率走势</p>
    <div ref="box" class="wr-chart" id="wrChart" @pointermove="pick" @pointerdown="down" @pointerleave="gv.wrHover = -1"><svg id="wrSvg" aria-hidden="true" v-html="v?.svg"></svg><div class="wr-tip" id="wrTip" :hidden="!v?.tip" :style="v?.tip ? { left: v.tip.left + 'px' } : undefined">{{ v?.tip?.text }}</div></div>
    <div class="wr-axis"><span>开局</span><span id="wrAxisEnd">第 {{ v ? v.n : 0 }} 手</span></div>
  </div>
</template>
