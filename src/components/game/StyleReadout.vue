<script setup>
/* 棋风读数：四个方面，双方各一个点，红线是这位对手平时的样子 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { styView } from '../../game/view.js';

const v = computed(() => { return ui.booted ? styView() : null; });
</script>

<template>
  <div class="sty" id="sty" :style="v ? { '--c': v.col } : undefined"><template v-if="v"><div class="sh">棋风读数<span><i class="lg-a"></i>{{ v.nameA + ' ' }}<i class="lg-b"></i>{{ v.nameB + (v.oName ? ' ' : '') }}<i v-if="v.oName" class="lg-u"></i><template v-if="v.oName">平时</template></span></div>
    <div v-if="v.wait" class="wait">再下几手就能看出双方的棋风。</div>
    <template v-else><template v-for="x in v.axes" :key="x.k"><span class="pl">{{ x.l }}</span><span class="tr"><i v-if="x.u !== null" class="usual" :style="{ left: x.u + '%' }" :title="v.oName + '平时'"></i><i v-if="x.b !== null" class="dot b" :style="{ left: x.b + '%' }" :title="v.nameB"></i><i v-if="x.a !== null" class="dot a" :style="{ left: x.a + '%' }" :title="v.nameA"></i></span><span class="pr">{{ x.r }}</span></template><div v-if="v.sum" class="sum" v-html="v.sum"></div></template></template></div>
</template>
