<script setup>
/* 定式棋盘：木纹、棋子、手数画在 canvas 上（book-page.js 的 paintBoard），推荐下法的编号圈是一层 SVG，方便点击 */
defineProps({ board: Object });
</script>

<template>
  <div class="bk-board" id="bkBoard"><canvas id="bkCv" aria-hidden="true"></canvas><canvas id="bkHv" aria-hidden="true"></canvas><svg viewBox="0 0 16 16" class="bk-ov" role="img" aria-label="定式棋盘"><g v-for="m in board.marks" :key="'m' + m.i" :class="m.cls" :data-i="m.i"><circle :cx="m.x" :cy="m.y"  r="0.42"/><text :x="m.x" :y="m.y + 0.02">{{ m.no }}</text><title>{{ m.title }}</title></g><g v-for="c in board.cands" :key="'c' + c.i" class="cand" :data-i="c.i"><circle :cx="c.x" :cy="c.y" r="0.42"/><text :x="c.x" :y="c.y + 0.02">{{ c.no }}</text><title>{{ c.title }}</title></g></svg></div>
</template>
