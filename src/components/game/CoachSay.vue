<script setup>
/* 陪练的话：气泡 + 刚才说过的几句。手机上只显示三行，长了点一下展开 */
import { computed, ref, watch, nextTick } from 'vue';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { S } from '../../ui/state.js';
import { narrow } from '../../ui/sound.js';
import { persona } from '../../game/coach.js';
import CoachFace from './CoachFace.vue';
import { onPt } from '../../game/marks.js';

const el = ref(null);
const v = computed(() => {
  if (!ui.booted || !S.coach || S.review >= 0) return null;
  if (!S.say && !ui.narrow) return null;
  return { pc: persona(), mood: S.mood || 'idle', html: S.say || '', empty: !S.say, hist: S.sayLog || [] };
});
// 说了新话：淡入动画重放
watch(() => gv.sayAnim, async () => {
  await nextTick();
  const e = el.value; if (!e) return;
  e.classList.remove('fade'); void e.offsetWidth; e.classList.add('fade');
});
function toggle(e) {
  if (onPt(e)) return;                             // 点的是坐标：棋盘上那一点闪一下，不展开
  if (!narrow() || !(gv.sayMore || gv.sayOpen)) return;
  if (gv.sayOpen) { gv.sayOpen = false; gv.sayMinH = ''; gv.sayMore = true; }
  else { gv.sayMinH = el.value.offsetHeight + 'px'; gv.sayMore = false; gv.sayOpen = true; }
}
</script>

<template>
  <div ref="el" class="say" id="coachSay" :hidden="!v" :class="{ fade: gv.sayAnim > 0, more: gv.sayMore, open: gv.sayOpen }" :style="{ minHeight: gv.sayMinH }" @click="toggle" @mouseover="onPt"><CoachFace id="coachFace" :pc="v?.pc" :mood="v?.mood" :pop="gv.facePop"/><div class="bubble"><span class="name" id="coachName">{{ v ? v.pc.name : '老陈' }}<small v-if="v?.pc.title">{{ v.pc.title }}</small></span><span v-if="v?.empty" id="coachText">……</span><span v-else id="coachText" v-html="v?.html"></span></div><ol class="say-hist" id="sayHist" aria-label="陪练刚才说的"><li v-for="(t, i) in v?.hist" :key="i" v-html="t"></li></ol></div>
</template>
