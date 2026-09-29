<script setup>
/* 翻谱：棋盘、翻页按钮、这一手的说明和下一手的几种下法、手顺、练习和「更多」 */
import { computed } from 'vue';
import { bt } from '../../stores/boards.js';
import { bookView } from '../../openings/book-view.js';
import { BK, ICO, bkCell, bkHover } from '../../openings/book-page.js';
import { bkBack, bkEngineLine, bkFwd, bkMenu, bkNext, bkPlay, bkToEnd, bkTrim, renderBookDetail } from '../../openings/book-layout.js';
import { playFromHere, prStart } from '../../openings/practice.js';
import BookBoard from './BookBoard.vue';
import LongText from './LongText.vue';

const v = computed(() => { return bookView(); });
// 引擎在推演时，别的按钮都不响应
const act = fn => (...a) => { if (!BK.job) fn(...a); };
const onBoard = act(e => {
  const ci = e.target.closest('[data-i]');
  if (ci) return bkPlay(+ci.dataset.i, ci.closest('.cand') ? 'engine' : 'user');
  const i = bkCell(e, e.currentTarget); if (i >= 0) bkPlay(i);
});
const onMove = e => { if (e.pointerType === 'touch') return; const i = bkCell(e, e.currentTarget); if (i !== BK.hov) bkHover(i); };
const toggleAll = act(() => { BK.all = !BK.all; renderBookDetail(); });
const menu = () => bkMenu(!bt.menu);
</script>

<template>
  <div class="bk-main">
    <div class="bk-stage">
    <header v-if="bt.roomy" class="bk-h bk-top"><h3>{{ v.label }}<small>{{ v.tag }}</small></h3><i :class="'ev ' + v.ev">{{ v.evText }}</i></header>
    <BookBoard :board="v.board" @click="onBoard" @pointermove="onMove" @pointerleave="bkHover(-1)"/>
    <div class="bk-navbar" role="toolbar" aria-label="翻谱">
      <button type="button" id="bkFirst" title="回到第 3 手（Home）" :disabled="v.n <= 3" aria-label="回到第 3 手" @click="act(bkTrim)(3)" v-html="ICO.first"></button>
      <button type="button" id="bkPrev" title="退一手（←）" :disabled="v.n <= 3" aria-label="退一手" @click="act(bkBack)(1)" v-html="ICO.prev"></button>
      <span class="pos">第 {{ v.n }} 手</span>
      <button type="button" id="bkNext" title="下一手（→）" :disabled="!v.nextOk" aria-label="下一手" @click="act(bkNext)()" v-html="ICO.next"></button>
      <button type="button" id="bkLast" title="沿主线走到底（End）" :disabled="!v.nextOk" aria-label="沿主线走到底" @click="act(bkToEnd)()" v-html="ICO.last"></button>
    </div>
    </div>
    <div class="bk-side">
      <header v-if="!bt.roomy" class="bk-h"><h3>{{ v.label }}<small>{{ v.tag }}</small></h3><i :class="'ev ' + v.ev">{{ v.evText }}</i></header>
      <div v-if="v.cur" class="bk-cur"><p><b>{{ v.cur.name }}</b><i :class="v.cur.book ? 'tg' : 'tg ai'">{{ v.cur.book ? '定式' : '开局库' }}</i>{{ v.cur.t + (v.cur.r ? ' ' : '') }}<em v-if="v.cur.r">{{ v.cur.r }}</em></p><small v-if="v.cur.w" class="aiev">{{ v.cur.w }}</small><LongText v-if="v.cur.long" :t="v.cur.long"/></div>
      <div v-else-if="v.intro" class="bk-cur bk-intro"><p>{{ v.intro.v }}</p><LongText v-if="v.intro.long" :t="v.intro.long"/></div>
      <p v-if="v.next.kind === 'win'" class="bk-win">{{ v.next.text }}</p>
      <div v-else-if="v.next.kind === 'kids'" class="bk-kids"><div class="kh">{{ v.next.head }}<small>{{ v.next.left }}</small></div><button v-for="r in v.next.rows" :key="r.i" type="button" :data-i="r.i" :class="r.cls" @click="act(bkPlay)(r.i, 'user')"><em>{{ r.no }}</em><b>{{ r.c }}</b><i :class="r.book ? 'tg' : 'tg ai'">{{ r.book ? '定式' : 'AI' }}</i><span><u v-if="r.main">主线</u>{{ r.t }}</span><small v-if="r.w">{{ r.w }}</small></button><button v-if="v.next.more > 0" type="button" class="linkish bk-all" id="bkAll" @click="toggleAll">{{ v.next.all ? '只看前三种' : `其余 ${v.next.more} 种下法` }}</button></div>
      <template v-else><p class="bk-off">{{ v.next.off }}</p><p v-if="v.next.wait" class="bk-wait">电脑计算中…</p><div v-else class="bk-cands"><div class="kh">电脑推荐<small>{{ v.next.form }}</small></div><button v-for="c in v.next.cands" :key="c.i" type="button" :data-i="c.i" data-src="engine" @click="act(bkPlay)(c.i, 'engine')"><span>{{ c.no }}</span>{{ c.c }}<small v-if="c.kind">{{ c.kind }}</small></button></div></template>
      <section class="bk-rec"><div class="kh">手顺<small class="bk-lg"><span v-if="v.past.length">点一手可退回</span><span><i class="book"></i>定式</span><span><i class="ai"></i>开局库</span><span><i class="engine"></i>电脑</span></small></div><div v-if="v.past.length || v.fut.length" class="bk-seq" aria-label="手顺"><button v-for="p in v.past" :key="'p' + p.to" type="button" :data-back="p.to" :class="p.cls" @click="act(bkTrim)(p.to)">{{ p.to }}<b>{{ p.c }}</b></button><button v-for="f in v.fut" :key="'f' + f.k" type="button" :data-fwd="f.k" class="fut" @click="act(bkFwd)(f.k)">{{ f.no }}<b>{{ f.c }}</b></button></div><p v-else class="bk-rec-empty">从第 4 手开始记在这里。点棋盘上的数字，或者按 ▶ 往下走。</p></section>
    </div>
    <div class="bk-go">
      <button type="button" class="primary" data-go="1" title="从当前局面开始，你执黑，电脑按谱应" @click="act(prStart)(1)">执黑练习</button><button type="button" data-go="2" title="从当前局面开始，你执白，电脑按谱应" @click="act(prStart)(2)">执白练习</button>
      <div class="bk-more"><button type="button" id="bkMore" :aria-expanded="String(bt.menu)" aria-haspopup="true" @click="menu">更多</button><div class="bk-menu" :hidden="!bt.menu">
        <button type="button" id="bkPv" :disabled="!!v.win || !!v.busy" @click="act(bkEngineLine)('pv')">{{ v.busy === 'pv' ? '推演中…' : '电脑续推 8 手' }}</button>
        <button type="button" id="bkVcf" :disabled="!!v.win || !!v.busy" @click="act(bkEngineLine)('vcf')">{{ v.busy === 'vcf' ? '计算中…' : `算杀：${v.side}棋连续冲四` }}</button>
        <button v-if="!v.win" type="button" data-go="here" @click="act(playFromHere)(BK.line.slice())">到对弈里接着下</button>
      </div></div>
    </div>
  </div>
</template>
