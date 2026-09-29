<script setup>
/* 跟陪练复盘：一处一处讲（内容由 game/lesson.js 的 lessonView() 给） */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { S } from '../../ui/state.js';
import { endLesson, goMoment, lessonView, toggleLine } from '../../game/lesson.js';
import { onPt } from '../../game/marks.js';
import CoachFace from './CoachFace.vue';

const v = computed(() => (ui.booted ? lessonView() : null));
const go = d => goMoment(S.lesson.at + d);
</script>

<template>
  <section v-if="v" class="lesson" id="lesson" aria-label="复盘讲解">
    <div class="ls-head"><CoachFace :pc="v.pc" :mood="v.mood || 'idle'"/><div class="ls-t"><b>跟{{ v.pc.name }}复盘</b><small v-if="v.pos">第 {{ v.pos }} 处</small></div>
      <button type="button" class="ls-x" aria-label="结束讲解" title="结束讲解" @click="endLesson(true)">×</button></div>
    <template v-if="v.none">
      <p class="ls-text">{{ v.text }}</p>
      <div class="ls-acts"><span class="sp"></span><button type="button" class="btn sm" @click="endLesson(true)">好</button></div>
    </template>
    <template v-else>
      <p class="ls-at" v-html="v.head" @mouseover="onPt" @click="onPt"></p>
      <p v-if="v.busy" class="ls-text ls-busy">{{ v.pc.name }}在看这一手……</p>
      <p v-else class="ls-text" v-html="v.text" @mouseover="onPt" @click="onPt"></p>
      <div class="ls-acts">
        <button v-if="v.canLine" type="button" class="btn sm" id="lsLine" :aria-pressed="v.show" @click="toggleLine()">{{ v.show ? '收起' : v.lineLabel }}</button>
        <span class="sp"></span>
        <button type="button" class="btn sm ghost" id="lsPrev" :disabled="!v.prev" @click="go(-1)">上一处</button>
        <button type="button" class="btn sm ls-next" id="lsNext" @click="v.next ? go(1) : endLesson()">{{ v.next ? '下一处' : '看完了' }}</button>
      </div>
    </template>
  </section>
</template>
