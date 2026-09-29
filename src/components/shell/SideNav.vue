<script setup>
/* 电脑端的侧栏：店招（点印章五下是彩蛋）、四个主页签、棋馆里的其他去处、规则、快捷键、我的。
   窄一些的电脑屏上收成一列图标（styles/shell.css）。 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { PROFILE } from '../../core/profile.js';
import { ST, playerG, playerName } from '../../story/story.js';
import { ACH } from '../../features/achievements.js';
import { DBG, dbgOpen } from '../../features/debug.js';
import { go, showKeysHere } from '../../ui/views.js';
import { NAV_MAIN, NAV_MORE, NAV_RULES, isOn } from '../../ui/nav.js';
import Avatar from '../Avatar.vue';
import { Bug, Keyboard } from 'lucide-vue-next';

const v = computed(() => {
  const booted = ui.booted, story = booted && ST.on;
  return {
    sub: story ? '临溪 · 半闲棋馆' : '五子棋 · 连珠',
    more: NAV_MORE.filter(n => !n.story || story).map(n => ({ ...n, dot: booted && (n.v === 'notes' ? ST.freshW > 0 : n.v === 'ach' ? ACH.fresh.length > 0 : false) })),
    me: booted && PROFILE.cur ? { name: playerName(), g: playerG() } : null,
    keys: ['game', 'dingshi', 'shafa'].includes(ui.view), dbg: booted && DBG.on,
  };
});
const href = n => '#/' + (n.v === 'home' ? '' : n.v);
</script>

<template>
  <nav class="sidenav" aria-label="页面">
    <h1 class="brand" title="回到主页" @click="go('home')"><span class="glyphs">枰间</span><span class="seal" aria-hidden="true">弈</span></h1>
    <p class="sn-sub">{{ v.sub }}</p>
    <div class="sn-group">
      <a v-for="n in NAV_MAIN" :id="n.id" :key="n.v" :href="href(n)" class="sn-item" :class="{ on: isOn(n, ui.view) }" :aria-current="isOn(n, ui.view) ? 'page' : null" :title="n.label" @click.prevent="go(n.v)"><component :is="n.icon" class="ic" aria-hidden="true"/><span>{{ n.label }}</span></a>
    </div>
    <div class="sn-group">
      <p class="sn-cap">棋馆</p>
      <a v-for="n in v.more" :key="n.v" :href="href(n)" class="sn-item" :class="{ on: isOn(n, ui.view) }" :aria-current="isOn(n, ui.view) ? 'page' : null" :title="n.label" @click.prevent="go(n.v)"><component :is="n.icon" class="ic" aria-hidden="true"/><span>{{ n.label }}</span><i v-if="n.dot" class="dotnew" aria-label="有新内容"></i></a>
    </div>
    <div class="sn-foot">
      <button v-if="v.dbg" type="button" id="dbgChip" class="sn-item sn-btn sn-dbg" title="调试面板" @click="dbgOpen()"><Bug class="ic" aria-hidden="true"/><span>调试</span></button>
      <button v-if="v.keys" type="button" id="keyHint" class="sn-item sn-btn sn-keys" title="键盘快捷键" @click="showKeysHere()"><Keyboard class="ic" aria-hidden="true"/><span>快捷键</span></button>
      <a :href="href(NAV_RULES)" class="sn-item" :class="{ on: ui.view === 'rules' }" title="规则" @click.prevent="go('rules')"><component :is="NAV_RULES.icon" class="ic" aria-hidden="true"/><span>规则</span></a>
      <a href="#/profile" id="pfChip" class="sn-me" :class="{ on: ui.view === 'profile' }" title="我的" @click.prevent="go('profile')">
        <Avatar v-if="v.me" :player="v.me.g" :size="34"/><span v-else class="avatar sn-noface" style="--s:34px">?</span>
        <div><b>{{ v.me ? v.me.name : '未建角色' }}</b><small>我的</small></div>
      </a>
    </div>
  </nav>
</template>
