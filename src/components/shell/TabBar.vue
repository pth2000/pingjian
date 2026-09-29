<script setup>
/* 手机底部页签：主页、对弈、定式、杀法、我的（札记、战绩、棋谱、成就、规则都从「我的」进） */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { ST } from '../../story/story.js';
import { ACH } from '../../features/achievements.js';
import { go } from '../../ui/views.js';
import { NAV_MAIN, NAV_ME, isOn } from '../../ui/nav.js';

const items = computed(() => {
  const dot = ui.booted && ((ST.on && ST.freshW > 0) || ACH.fresh.length > 0);
  return [...NAV_MAIN, { ...NAV_ME, dot }];
});
const href = n => '#/' + (n.v === 'home' ? '' : n.v);
</script>

<template>
  <nav class="tabbar" aria-label="页面">
    <a v-for="n in items" :key="n.v" :href="href(n)" :data-tab="n.v" :class="{ on: isOn(n, ui.view) }" :aria-current="isOn(n, ui.view) ? 'page' : null" @click.prevent="go(n.v)">
      <span class="tbi"><component :is="n.icon" class="ic" aria-hidden="true"/><i v-if="n.dot" class="dotnew"></i></span>{{ n.label }}</a>
  </nav>
</template>
