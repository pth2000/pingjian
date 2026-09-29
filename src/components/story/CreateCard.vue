<script setup>
/* 建角色：剧情模式开关、称呼；开了剧情才选模样（剧情头像），关着时用简单的棋子头像 */
import { ref } from 'vue';
import { PROFILE } from '../../core/profile.js';
import { stClose } from '../../story/story.js';
import { plainFace } from '../../story/player-face.js';
import GenderPick from './GenderPick.vue';
import Toggle from '../Toggle.vue';

defineProps({ canCancel: Boolean });
const form = ref(null), name = ref(''), err = ref(''), on = ref(true);
const plain = plainFace();
function submit() {
  const v = name.value.trim(), g = on.value ? (form.value.querySelector('input[name="stG"]:checked') || {}).value || 'm' : 'm';
  if (!v) { err.value = '请填写称呼。'; return; }
  if (PROFILE.list.some(p => p.name === v)) { err.value = '已有同名角色。'; return; }
  PROFILE.create(v, g, on.value);
}
</script>

<template>
  <template v-if="on"><p class="st-k">初到临溪</p><h3>怎么称呼你？</h3>
    <p class="st-intro">你刚到江南小镇临溪，听说镇上的半闲棋馆常有人下棋。进门之前，先留个称呼吧。</p></template>
  <template v-else><p class="st-k">新建角色</p><h3>称呼</h3></template>
  <form ref="form" class="st-form" id="stCreate" @submit.prevent="submit">
    <div class="st-opt"><Toggle id="stOn" v-model="on" label="剧情模式"/></div>
    <GenderPick v-if="on"/><div v-else class="st-plain"><span class="st-gf on" v-html="plain"></span></div>
    <input id="stName" v-model="name" maxlength="8" placeholder="比如：阿岚" autocomplete="off" autofocus><small id="stErr">{{ err }}</small>
    <div class="st-acts"><button v-if="canCancel" type="button" @click="stClose()">取消</button><button type="submit" class="primary">{{ on ? '进门' : '创建' }}</button></div></form>
  <p class="st-fine">每个角色的战绩、棋谱、成就分开保存在这台设备上；剧情模式可随时在「我的」中更改。</p>
</template>
