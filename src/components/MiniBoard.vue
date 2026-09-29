<script>
// 小棋盘：主页、棋谱列表、继续对局的缩略图。木色底、发丝网格、五个星位，棋子带一点光泽。网格线只算一次
const N = 15, C = 10, P = 7, W = P * 2 + C * 14;
let G = '';
for (let k = 1; k < N - 1; k++) G += `M${P} ${P + k * C}H${P + 14 * C}M${P + k * C} ${P}V${P + 14 * C}`;
const STARS = [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]].map(([x, y]) => [P + x * C, P + y * C]);
</script>

<script setup>
defineProps({ moves: { type: Array, required: true }, last: { type: Boolean, default: true } });
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${W}`" class="mini" aria-hidden="true">
    <defs>
      <linearGradient id="mbWood" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#E7C589"/><stop offset=".5" stop-color="#DCB575"/><stop offset="1" stop-color="#CFA25E"/></linearGradient>
      <radialGradient id="mbB" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#6d6f6d"/><stop offset=".45" stop-color="#232423"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
      <radialGradient id="mbW" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#F1F0E8"/><stop offset="1" stop-color="#C9C8BE"/></radialGradient>
    </defs>
    <rect :width="W" :height="W" rx="4" fill="url(#mbWood)"/>
    <path :d="G" class="gl"/>
    <rect :x="P" :y="P" :width="C * 14" :height="C * 14" class="gb"/>
    <circle v-for="([x, y], i) in STARS" :key="'s' + i" :cx="x" :cy="y" r="1.3" class="st"/>
    <circle v-for="(m, k) in moves" :key="k" :cx="P + (m % N) * C" :cy="P + ((m / N) | 0) * C" r="4.5" :class="k % 2 ? 'w' : 'b'"/>
    <circle v-if="last && moves.length" :cx="P + (moves[moves.length - 1] % N) * C" :cy="P + ((moves[moves.length - 1] / N) | 0) * C" r="1.6" class="lm"/>
  </svg>
</template>

<style>
svg.mini .gl{stroke:rgba(52,34,12,.42);stroke-width:.55;fill:none}
svg.mini .gb{stroke:rgba(52,34,12,.7);stroke-width:.9;fill:none}
svg.mini .st{fill:rgba(46,30,10,.8)}
svg.mini .b{fill:url(#mbB)}
svg.mini .w{fill:url(#mbW);stroke:rgba(20,24,22,.25);stroke-width:.4}
svg.mini .lm{fill:var(--seal)}
</style>
