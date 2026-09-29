<script setup>
/* 杀法练习页：题目列表 + 题目。整页一屏的尺寸由 book-layout.js 的 dsLayout() 算 */
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { PZ } from '../puzzles/puzzles.js';
import PuzzleList from '../components/puzzle/PuzzleList.vue';
import PuzzlePanel from '../components/puzzle/PuzzlePanel.vue';

const on = computed(() => { return ui.booted && PZ.opened; });
</script>

<template>
  <section class="view v-shafa ds-page" data-v="shafa" id="vShafa" aria-label="杀法练习">
    <PuzzleList/>
    <div class="bk-detail" id="pzDetail"><PuzzlePanel v-if="on"/></div>
  </section>
</template>
