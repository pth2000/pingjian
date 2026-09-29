<script setup>
/* 选模样：青衫 / 红袖 */
import { playerFace } from '../../story/player-face.js';

defineProps({ name: { type: String, default: 'stG' }, cur: { type: String, default: 'm' } });
const G = [['m', '青衫'], ['f', '红袖']];
</script>

<template>
  <div class="st-gender" role="radiogroup" aria-label="模样"><label v-for="[g, t] in G" :key="g" class="st-g"><input type="radio" :name="name" :value="g" :checked="cur === g"><span class="st-gf" v-html="playerFace(g)"></span><b>{{ t }}</b></label></div>
</template>
