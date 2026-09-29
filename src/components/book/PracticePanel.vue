<script setup>
/* 定式练习：你执一方，电脑按谱应；每一手当场对照谱 */
import { bt } from '../../stores/boards.js';
import { computed } from 'vue';
import { practiceView } from '../../openings/book-view.js';
import { BK, ICO, bkCell, bkHover } from '../../openings/book-page.js';
import { playFromHere, prEnd, prGoOn, prHint, prPlay, prRestart, prUndo } from '../../openings/practice.js';
import BookBoard from './BookBoard.vue';

const v = computed(() => { return practiceView(); });
function onBoard(e) {
  const ci = e.target.closest('[data-i]'); if (ci) return prPlay(+ci.dataset.i);
  const i = bkCell(e, e.currentTarget); if (i >= 0) prPlay(i);
}
const onMove = e => { if (e.pointerType === 'touch') return; const i = bkCell(e, e.currentTarget); if (i !== BK.hov) bkHover(i); };
</script>

<template>
  <div class="bk-main">
    <div class="bk-stage">
    <header v-if="bt.roomy" class="bk-h bk-top"><h3>{{ v.label }}<small>{{ v.tag }}</small></h3><i :class="'ev ' + v.ev">{{ v.evText }}</i></header>
    <BookBoard :board="v.board" @click="onBoard" @pointermove="onMove" @pointerleave="bkHover(-1)"/>
    <div class="bk-navbar pr-nav" role="toolbar" aria-label="练习">
      <button type="button" id="prRestart" title="从头再练" aria-label="从头再练" :disabled="!v.canBack" @click="prRestart()" v-html="ICO.first"></button>
      <button type="button" id="prUndo" title="悔一步（←）" aria-label="悔一步" :disabled="!v.canBack" @click="prUndo()" v-html="ICO.prev"></button>
      <span class="pos">第 {{ v.n }} 手 · {{ v.state }}</span>
      <button type="button" id="prHint" title="提示（H）" :disabled="!v.mine" @click="prHint()">提示</button>
    </div>
    </div>
    <div class="bk-side">
      <header v-if="!bt.roomy" class="bk-h"><h3>{{ v.label }}<small>{{ v.tag }}</small></h3><i :class="'ev ' + v.ev">{{ v.evText }}</i></header>
      <div class="pr-box"><b>练习中 · 你执{{ v.side }}</b><span>谱上 <em>{{ v.ok }}</em> 手 · 出谱 <em>{{ v.off }}</em> 手</span></div>
      <div v-if="v.msg" :class="'pz-msg ' + v.msg.kind" role="status" v-html="v.msg.html"></div>
      <div v-if="v.decide" class="pr-decide"><button type="button" class="primary" id="prUndo2" @click="prUndo()">悔一步，换一手</button><button type="button" id="prGoOn" @click="prGoOn()">就这样接着下</button></div>
      <section class="bk-rec"><div class="kh">手顺<small class="bk-lg"><span><i class="book"></i>定式</span><span><i class="ai"></i>开局库</span><span><i class="engine"></i>电脑</span></small></div><div v-if="v.past.length" class="bk-seq ro" aria-label="手顺"><button v-for="p in v.past" :key="p.no" type="button" :class="p.cls" tabindex="-1">{{ p.no }}<b>{{ p.c }}</b></button></div><p v-else class="bk-rec-empty">从第 4 手开始记在这里。</p></section>
    </div>
    <div class="bk-go">
      <button type="button" class="primary" id="prEnd" @click="prEnd()">结束练习</button>
      <button type="button" id="prToGame" :disabled="v.busy" @click="playFromHere(BK.line.slice())">到对弈里下完</button>
    </div>
  </div>
</template>
