<script setup>
/* 定式页：开局列表 + 翻谱（或练习）。整页一屏的尺寸由 book-layout.js 的 dsLayout() 算 */
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { BK } from '../openings/book-page.js';
import BookStrip from '../components/book/BookStrip.vue';
import BookPanel from '../components/book/BookPanel.vue';
import PracticePanel from '../components/book/PracticePanel.vue';

const mode = computed(() => { return !ui.booted || !BK.op ? '' : BK.pr ? 'pr' : 'book'; });
</script>

<template>
  <section class="view v-dingshi ds-page" data-v="dingshi" id="vDingshi" aria-label="定式">
    <BookStrip/>
    <div class="bk-detail" id="bkDetail"><PracticePanel v-if="mode === 'pr'"/><BookPanel v-else-if="mode === 'book'"/></div>
  </section>
</template>
