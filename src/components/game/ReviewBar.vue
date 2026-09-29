<script setup>
/* 复盘条：翻手、从此处继续、退出复盘；下面一行说这手棋的胜率变化和推荐 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { S } from '../../ui/state.js';
import { reviewView } from '../../game/view.js';
import { enterReview, exitReview, resumeFrom, reviewGo } from '../../game/review.js';
import { onPt } from '../../game/marks.js';

const v = computed(() => { return ui.booted ? reviewView() : null; });
</script>

<template>
  <div class="reviewbar" id="reviewBar" :hidden="!v">
    <button id="rvFirst" type="button" title="回到开局" :disabled="v?.atStart" @click="enterReview(0)">⏮</button>
    <button id="rvPrev" type="button" title="上一手" :disabled="v?.atStart" @click="reviewGo(-1)">◀</button>
    <span class="pos" id="rvPos">{{ v ? v.pos : '0 / 0' }}</span>
    <button id="rvNext" type="button" title="下一手" :disabled="v?.atEnd" @click="reviewGo(1)">▶</button>
    <button id="rvLast" type="button" title="到最后" :disabled="v?.atEnd" @click="enterReview(S.moves.length)">⏭</button>
    <span class="sep"></span>
    <button id="rvResume" type="button" :disabled="v?.noResume" @click="resumeFrom()">从此处继续</button>
    <button id="rvExit" type="button" @click="exitReview()">退出复盘</button>
  </div>
  <p class="rvinfo" id="rvInfo" :hidden="!v" v-html="v?.info" @mouseover="onPt" @click="onPt"></p>
</template>
