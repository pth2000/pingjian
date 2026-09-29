<script setup>
/* 最后一步：TA 的故事走完以后，选做朋友还是说出心意（kind: final / replay） */
import { computed, ref } from 'vue';
import { STORY } from '../../story/story-data.js';
import { OPP } from '../../ui/state.js';
import { oppArt, oppFace } from '../../story/portraits.js';
import { ST, fmtDay, stClose, stFill } from '../../story/story.js';
import { bondName, chooseBond, romanceKind } from '../../story/bonds.js';

const props = defineProps({ ev: Object });
const picked = ref(props.ev.kind === 'replay' ? ST.bond[props.ev.id] : '');
const paras = t => t.split('\n').map(p => stFill(p, props.ev.id));
const v = computed(() => {
  const id = props.ev.id, d = STORY[id], f = d.final;
  const part = picked.value === 'special' ? f.special : picked.value === 'love' ? f.love : f.friend;
  return {
    full: oppArt(id, 'f'), face: oppFace(id), name: OPP[id].name,
    k: props.ev.kind === 'replay' ? [bondName(id), fmtDay(ST.bondT[id])].filter(Boolean).join(' · ') : `${d.arc.title} · 最后一步`,
    scene: paras(f.scene), pick: stFill(f.friendPick || '做' + f.friend.bond, id), romance: romanceKind(id),
    out: picked.value ? paras(part.text) : [], bond: picked.value ? bondName(id) : '',
  };
});
function pick(kind) { chooseBond(props.ev.id, kind); picked.value = kind; }
</script>

<template>
  <span v-if="v.full" class="st-full"><img :src="v.full" alt="" draggable="false"></span><span v-else class="st-face" v-html="v.face"></span><p class="st-k">{{ v.k }}</p><h3>{{ v.name }}</h3>
  <div class="st-reveal"><p v-for="(p, i) in v.scene" :key="i" v-html="p"></p></div>
  <div v-if="!picked" class="st-acts st-choice">
    <template v-if="v.romance"><button type="button" data-bond="friend" @click="pick('friend')">{{ v.pick }}</button><button type="button" class="primary" data-bond="romance" @click="pick(v.romance)">说出心意</button></template>
    <button v-else type="button" class="primary" data-bond="friend" @click="pick('friend')">{{ v.pick }}</button>
  </div>
  <template v-else>
    <div class="st-reveal st-out"><p v-for="(p, i) in v.out" :key="i" v-html="p"></p></div>
    <p class="st-bond">{{ v.name }} · {{ v.bond }}</p><div class="st-acts"><button type="button" class="primary" @click="stClose()">{{ ev.kind === 'replay' ? '合上' : '嗯' }}</button></div>
  </template>
</template>
