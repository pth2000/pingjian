<script setup>
/* 猜先卡：盖在棋盘上。先选猜单还是猜双，再把握着的白子两子一对摆开，余一子为单 */
import { computed } from 'vue';
import { gv } from '../../stores/game-ui.js';
import { endNigiri, guessNigiri } from '../../game/nigiri.js';
import { opWanted } from '../../game/opening-rule.js';

const op = computed(() => !!gv.nigiri && opWanted());
const pairs = computed(() => {
  const g = gv.nigiri; if (!g || g.phase !== 'reveal') return [];
  const out = []; for (let k = 0; k < g.n; k += 2) out.push(k + 1 < g.n ? 2 : 1);
  return out;
});
</script>

<template>
  <div v-if="gv.nigiri" class="nigiri" id="nigiri" role="dialog" aria-modal="false" aria-labelledby="ngTitle">
    <div class="ng-card">
      <p class="eyebrow">猜先</p>
      <template v-if="gv.nigiri.phase === 'ask'">
        <h3 id="ngTitle">{{ op ? '谁先摆？' : '谁执黑？' }}</h3>
        <p class="ng-t">一方握一把白子，另一方猜单双。猜中者{{ op ? '为假先方，先摆开局' : '执黑先行' }}。</p>
        <div class="ng-fist" aria-hidden="true"><span class="ng-jar"></span><i></i><i></i><i></i></div>
        <div class="ng-acts"><button type="button" class="btn" id="ngOdd" @click="guessNigiri(true)">猜单</button><button type="button" class="btn" id="ngEven" @click="guessNigiri(false)">猜双</button></div>
        <button type="button" class="linkish ng-skip" id="ngSkip" @click="endNigiri()">不猜先，直接开始</button>
      </template>
      <template v-else>
        <div class="ng-stones" aria-hidden="true"><span v-for="(p, k) in pairs" :key="k" class="ng-pair" :class="{ lone: p === 1 }"><i v-for="q in p" :key="q" :style="{ animationDelay: (k * 2 + q) * 45 + 'ms' }"></i></span></div>
        <h3 id="ngTitle">{{ gv.nigiri.n }} 子 · {{ gv.nigiri.odd ? '单' : '双' }}</h3>
        <p class="ng-t ng-res" :class="{ hit: gv.nigiri.hit }">所猜为「{{ gv.nigiri.guess ? '单' : '双' }}」，{{ gv.nigiri.hit ? '猜中' : '未猜中' }}。{{ gv.nigiri.hit ? '猜子方' : '握子方' }}{{ op ? '为假先方，先摆开局。' : '执黑先行。' }}</p>
        <div class="ng-acts"><button type="button" class="btn accent" id="ngGo" @click="endNigiri()">开始对局</button></div>
      </template>
    </div>
  </div>
</template>
