<script setup>
/* 杀法练习：棋盘、换题、题目说明、提示 / 重来 / 看答案 */
import { computed } from 'vue';
import { bt } from '../../stores/boards.js';
import { pzView } from '../../puzzles/view.js';
import { PZ, PZ_ICO, pzAnswer, pzHint, pzHover, pzOpen, pzPlay, pzReset } from '../../puzzles/puzzles.js';
import { bkCell } from '../../openings/book-page.js';

const v = computed(() => { return pzView(); });
function onBoard(e) { const i = bkCell(e, e.currentTarget); if (i >= 0) pzPlay(i); }
function onMove(e) { if (e.pointerType === 'touch') return; const i = bkCell(e, e.currentTarget); if (i !== PZ.hov) pzHover(i); }
</script>

<template>
  <div class="bk-main">
    <div class="bk-stage">
    <header v-if="bt.roomy" class="bk-h bk-top"><h3>第 <span class="bk-no">{{ v.k + 1 }}</span> 题<small>{{ v.lv }} · {{ v.A }}先</small></h3><i :class="v.black ? 'ev b3' : 'ev w1'">最短 {{ v.steps }} 手杀</i><i v-if="v.badge" :class="'pz-badge ' + v.badge.g">{{ v.badge.text }}</i></header>
    <div class="bk-board" id="pzBoard" @click="onBoard" @pointermove="onMove" @pointerleave="pzHover(-1)"><canvas id="pzCv" aria-hidden="true"></canvas><canvas id="pzHv" aria-hidden="true"></canvas><svg viewBox="0 0 16 16" class="bk-ov" id="pzOv" role="img" aria-label="杀法练习棋盘"><g v-if="v.marks.hint" class="pz-hint"><circle :cx="v.marks.hint.x" :cy="v.marks.hint.y" r="0.42"/><circle class="pulse" :cx="v.marks.hint.x" :cy="v.marks.hint.y" r="0.42"/></g><g v-if="v.marks.flash" class="pz-bad"><circle :cx="v.marks.flash.x" :cy="v.marks.flash.y" r="0.42"/><path :d="v.marks.flash.d"/></g><g v-if="v.marks.win" :class="v.marks.win.seen ? 'pz-win seen' : 'pz-win'"><line :x1="v.marks.win.x1" :y1="v.marks.win.y1" :x2="v.marks.win.x2" :y2="v.marks.win.y2"/></g><g v-if="v.marks.winx" class="pz-winx"><circle :cx="v.marks.winx.x" :cy="v.marks.winx.y" r="0.42"/><path :d="v.marks.winx.d"/></g></svg><div v-if="bt.stamp" :key="bt.stamp.key" :class="bt.stamp.perfect ? 'pz-stamp perfect' : 'pz-stamp'"><b>杀</b><small>{{ bt.stamp.perfect ? '一次解开' : '解开了' }}</small></div></div>
    <div class="bk-navbar pz-nav" role="toolbar" aria-label="换题">
      <button type="button" id="pzPrev" :disabled="v.k <= 0" aria-label="上一题" title="上一题（←）" @click="pzOpen(v.k - 1)" v-html="PZ_ICO.prev"></button>
      <span class="pos">第 {{ v.k + 1 }} / {{ v.total }} 题</span>
      <button type="button" id="pzNext" :disabled="v.k >= v.last" aria-label="下一题" title="下一题（→）" @click="pzOpen(v.k + 1)" v-html="PZ_ICO.next"></button>
    </div>
    </div>
    <div class="bk-side">
      <header v-if="!bt.roomy" class="bk-h"><h3>第 <span class="bk-no">{{ v.k + 1 }}</span> 题<small>{{ v.lv }} · {{ v.A }}先</small></h3><i :class="v.black ? 'ev b3' : 'ev w1'">最短 {{ v.steps }} 手杀</i><i v-if="v.badge" :class="'pz-badge ' + v.badge.g">{{ v.badge.text }}</i></header>
      <p class="pz-goal">{{ v.A }}先。每一手都要<b>冲四</b>或者直接<b>成五</b>，逼{{ v.D }}棋只能挡，一路冲到五连。{{ v.black ? '黑棋要避开禁手。' : '黑棋挡的点如果是禁手，就挡不住。' }}</p>
      <div v-if="v.msg" class="pz-msg" :class="[v.msg.kind, { solved: v.msg.solved }]" role="status" v-html="v.msg.html"></div>
      <section class="bk-rec"><div class="kh">手顺<small>{{ v.mine }}</small></div><div v-if="v.moves.length" class="bk-seq"><button v-for="m in v.moves" :key="m.no" type="button" :class="m.cls" tabindex="-1">{{ m.no }}<b>{{ m.c }}</b></button></div><p v-else class="bk-rec-empty">盘上是题目给的局面，最后一手带红点。轮到{{ v.A }}棋，直接在棋盘上落子。</p></section>
    </div>
    <div class="bk-go pz-go">
      <button v-if="v.over && v.k < v.last" type="button" class="primary pz-gonext" id="pzGoNext" @click="pzOpen(v.k + 1)">下一题 ›</button><button v-else type="button" class="primary" id="pzHint" :disabled="v.over || v.busy" @click="pzHint()">提示</button>
      <button type="button" id="pzReset" :disabled="!v.canReset" @click="pzReset()">重来</button>
      <button type="button" id="pzAns" :disabled="v.over || v.busy" @click="pzAnswer()">看答案</button>
    </div>
  </div>
</template>
