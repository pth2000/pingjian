<script setup>
/* 本局表现（两边对照）+ 棋风读数，在右栏「数据」页里 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { perfView } from '../../game/view.js';
import StyleReadout from './StyleReadout.vue';
import { save } from '../../core/storage.js';

const v = computed(() => { return ui.booted ? perfView() : null; });
function toggle() { gv.perfOpen = !gv.perfOpen; save('perf', gv.perfOpen ? 1 : 0); }
</script>

<template>
  <details class="perf-wrap" id="perfWrap" :open="gv.perfOpen" :hidden="!v">
    <summary id="perfHead" @click.prevent="toggle"><span id="perfSum">本局表现 · 棋风</span><span class="tgl" id="perfTgl">{{ gv.perfOpen ? '收起' : '展开' }}</span></summary>
    <div class="perf" id="perf"><template v-if="v"><span class="ph"></span><span v-for="h in v.heads" :key="h.c" class="ph"><i class="sw" :class="h.c === 1 ? 'b' : 'w'"></i>{{ h.label }}</span><template v-for="r in v.rows" :key="r.k"><span class="k" :class="{ opt: r.opt }">{{ r.k }}</span><span class="v" :class="{ hi: r.hiA, opt: r.opt }">{{ r.a }}</span><span class="v" :class="{ hi: r.hiB, opt: r.opt }">{{ r.b }}</span></template><span v-if="!v.reveal" class="pnote">疑问手、败着等评估数据终局后显示</span></template></div>
    <StyleReadout/>
  </details>
</template>
