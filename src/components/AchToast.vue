<script setup>
/* 成就达成：从顶上滑下来一张小卡，点一下去成就页。排队和计时在 features/achievements.js 的 achToast() */
import { ui } from '../stores/ui.js';
import { ACH_TIER } from '../features/achievements.js';
import { showView } from '../ui/views.js';
</script>

<template>
  <div v-if="ui.ach.a" id="achToast" role="status" :class="['t' + ui.ach.a.t, { show: ui.ach.show }]" @click="showView('ach')"><span class="ach-seal">{{ ui.ach.a.g }}</span><span class="at"><small>{{ ui.ach.a.label || '获得成就 · ' + ACH_TIER[ui.ach.a.t] }}</small><b>{{ ui.ach.a.name }}</b><span>{{ ui.ach.a.desc }}</span></span></div>
</template>
