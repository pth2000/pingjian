<script setup>
/* 一段故事：某位熟客的故事走到了哪一步（d: { id, i, replay }） */
import { computed } from 'vue';
import { STORY } from '../../story/story-data.js';
import { OPP } from '../../ui/state.js';
import { oppFace } from '../../story/portraits.js';
import { stClose, stFill } from '../../story/story.js';

const props = defineProps({ d: Object });
const NUM = '一二三四五六';
const v = computed(() => {
  const d = props.d, a = STORY[d.id].arc, s = a.steps[d.i];
  return { k: `${OPP[d.id].name} · ${a.title} · 其${NUM[d.i]}`, title: s.title, face: oppFace(d.id), paras: String(s.text).split('\n').map(p => stFill(p, d.id)) };
});
</script>

<template>
  <div class="st-faces"><span class="st-face" v-html="v.face"></span></div>
  <p class="st-k">{{ v.k }}</p><h3>{{ v.title }}</h3>
  <div class="st-reveal"><p v-for="(p, i) in v.paras" :key="i" v-html="p"></p></div>
  <div class="st-acts"><button type="button" class="primary" @click="stClose()">{{ d.replay ? '合上' : '嗯' }}</button></div>
</template>
