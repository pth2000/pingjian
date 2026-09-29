<script setup>
/* 开局规则进行中：这一步该谁、要做什么、要选的按钮（内容由 game/opening-rule.js 的 openingView() 给）。
   电脑上浮在棋盘下沿（where="board"），眼睛不用离开棋盘；手机上在局势区，固定在底部按钮上方（where="hud"）。
   浮在棋盘上时卡片本身不挡点击（pointer-events 只留给按钮），盖住的格子照样能点。 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { S } from '../../ui/state.js';
import { N } from '../../engine/engine.js';
import { openingView, opChoose, opDeclare } from '../../game/opening-rule.js';

const props = defineProps({ where: { type: String, default: 'hud' } });
const v = computed(() => (ui.booted && (props.where === 'board') === !ui.narrow ? openingView() : null));
// 浮在棋盘上时：下半边子多就挪到上沿，别把子盖住
const top = computed(() => {
  if (!v.value || props.where !== 'board') return false;
  let lo = 0, hi = 0;
  for (const i of S.moves.concat(S.op ? S.op.offers : [])) { const y = (i / N) | 0; if (y >= 9) lo++; else if (y <= 5) hi++; }
  return lo > hi;
});
</script>

<template>
  <section v-if="v" class="opening" :class="['on-' + where, { top }]" id="opening" aria-label="开局" aria-live="polite">
    <div class="op-head"><b>{{ v.title }}</b><small>{{ v.colors }}</small></div>
    <p class="op-who"><span class="op-seal" :class="{ busy: v.busy }">{{ v.busy ? `${v.who}思考中` : `轮到${v.who}` }}</span><small v-if="v.parties">{{ v.parties }}</small><small v-if="v.offers" class="op-n">打点 {{ v.offers }}</small></p>
    <p class="op-tip">{{ v.tip }}</p>
    <div v-if="v.btns.length" class="op-acts"><button v-for="[k, t] in v.btns" :key="k" type="button" class="btn sm" :id="'op-' + k" @click="opChoose(k)">{{ t }}</button></div>
    <div v-if="v.declare" class="op-acts op-nums" role="group" aria-label="打点数"><button v-for="n in v.maxN" :key="n" type="button" class="btn sm" :id="'op-n' + n" @click="opDeclare(n)">{{ n }}</button></div>
  </section>
</template>
