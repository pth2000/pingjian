<script setup>
/* 失误提醒：落子后、对手应棋前，陪练先暂停对局，说明这手的问题；可以仍下此处，或撤回改下建议的位置 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { S } from '../../ui/state.js';
import { persona, coachKeep, coachTake } from '../../game/coach.js';
import CoachFace from './CoachFace.vue';
import { onPt } from '../../game/marks.js';

const p = computed(() => { return ui.booted ? S.pending : null; });
const pc = computed(() => { return ui.booted ? persona() : null; });
</script>

<template>
  <div class="coach" id="coachBox" :hidden="!p">
    <div class="head"><CoachFace id="coachFace2" :pc="pc" mood="worry"/><h3 id="coachTitle">{{ p ? p.title : '等一下' }}</h3></div>
    <div class="why" id="coachWhy" v-html="p?.why" @mouseover="onPt" @click="onPt"></div>
    <div class="acts">
      <button id="coachKeep" type="button" title="Esc" @click="coachKeep()">仍下此处</button>
      <button class="primary" id="coachTake" type="button" title="Enter" @click="coachTake()">{{ p ? p.take : '撤回改下' }}</button>
    </div>
  </div>
</template>
