<script setup>
/* 手机顶栏：左边是店招印章（页签页）或返回（其余各页），中间是页名，右边是我的 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { PROFILE } from '../../core/profile.js';
import { playerG } from '../../story/story.js';
import { DBG, dbgOpen } from '../../features/debug.js';
import { go, goBack } from '../../ui/views.js';
import { TOP_LEVEL, VIEW_TITLE } from '../../ui/nav.js';
import Avatar from '../Avatar.vue';
import { Bug, ChevronLeft } from 'lucide-vue-next';

const v = computed(() => ({
  top: TOP_LEVEL.includes(ui.view), title: ui.view === 'setup' && ui.setupSel.mode === 'pvp' ? '双人对弈' : VIEW_TITLE[ui.view] || '',   // 设置页分人机、双人两种
  g: ui.booted && PROFILE.cur ? playerG() : '', dbg: ui.booted && DBG.on,
}));
</script>

<template>
  <header class="topbar">
    <h1 v-if="v.top" class="brand tb-brand" title="回到主页" @click="go('home')"><span class="seal" aria-hidden="true">弈</span></h1>
    <button v-else type="button" class="ghost tb-back" aria-label="返回" @click="goBack()"><ChevronLeft class="ic" aria-hidden="true"/></button>
    <b class="tb-title">{{ v.title }}</b>
    <div class="tb-r">
      <button v-if="v.dbg" type="button" class="ghost tb-dbg" aria-label="调试面板" @click="dbgOpen()"><Bug class="ic" aria-hidden="true"/></button>
      <a v-if="ui.view !== 'profile'" href="#/profile" class="tb-me" aria-label="我的" @click.prevent="go('profile')"><Avatar v-if="v.g" :player="v.g" :size="30"/></a>
    </div>
  </header>
</template>
