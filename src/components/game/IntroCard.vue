<script setup>
/* 开局卡：亮出这局的对手（双人对弈是「黑先白后」），一两秒后自己收起。内容由 new-game.js 的 showIntro() 给 */
import { gv } from '../../stores/game-ui.js';
</script>

<template>
  <div class="intro" id="intro" :hidden="!gv.introOn" aria-hidden="true">
    <div :key="gv.introSeq" class="intro-card"><template v-if="gv.intro"><span v-if="gv.intro.pvp" class="intro-mark" id="introMark" style="background:var(--seal)">弈</span><span v-else class="intro-mark pf" id="introMark" style="background:none" v-html="gv.intro.face"></span><span class="intro-vs" id="introVs">{{ gv.intro.vs }}</span><b id="introName">{{ gv.intro.name }}</b><small id="introSub">{{ gv.intro.sub }}</small><q class="intro-q" id="introQ" :hidden="!gv.intro.q" v-html="gv.intro.q"></q></template><template v-else><span class="intro-mark" id="introMark">雷</span><span class="intro-vs" id="introVs">对阵</span><b id="introName">惊雷</b><small id="introSub">你执黑先行</small><q class="intro-q" id="introQ" hidden></q></template></div>
  </div>
</template>
