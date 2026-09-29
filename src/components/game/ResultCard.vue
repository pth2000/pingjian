<script setup>
/* 结算卡：胜负印章、一句话、对手的话、交情、手数用时胜率、接下来做什么。内容由 play.js 的 showResult() 给 */
import { ref, watch, nextTick } from 'vue';
import { gv } from '../../stores/game-ui.js';
import { hideResult, reviewAfterGame } from '../../game/play.js';
import { showView } from '../../ui/views.js';
import { S } from '../../ui/state.js';
import { persona } from '../../game/coach.js';
import { startLesson } from '../../game/lesson.js';

const acts = ref(null);
watch(() => gv.resultSeq, async () => { await nextTick(); const b = acts.value && acts.value.querySelector('button'); if (b) b.focus({ preventScroll: true }); });
const home = () => { hideResult(); showView('home'); };
</script>

<template>
  <div class="result" id="result" :hidden="!gv.resultOn" role="dialog" aria-modal="false" aria-labelledby="resTitle" @click.self="hideResult()">
    <div class="result-card"><button type="button" class="res-x" id="resX" aria-label="关闭，看棋盘" title="关闭，看棋盘" @click="hideResult()">×</button>
      <template v-if="gv.result">
        <div :key="gv.resultSeq" :class="gv.result.stampCls" id="resStamp">{{ gv.result.stamp }}</div>
        <h3 id="resTitle">{{ gv.result.title }}</h3>
        <p id="resSub">{{ gv.result.sub }}</p>
        <p class="res-q" id="resQ" :hidden="!gv.result.q" v-html="gv.result.q"></p>
        <div class="res-story" id="resStory" :hidden="!gv.result.story" v-html="gv.result.story"></div>
        <span class="badge" id="resBadge" :hidden="!gv.result.badge">{{ gv.result.badge }}</span>
        <div class="result-stats">
          <div><b id="resMoves">{{ gv.result.n }}</b>手数</div>
          <div><b id="resTime">{{ gv.result.time }}</b>用时</div>
          <div><b id="resRate">{{ gv.result.rate }}</b><span id="resRateLbl">{{ gv.result.rateLbl }}</span></div>
        </div>
        <div ref="acts" class="result-actions" id="resActions"><button v-for="b in gv.result.btns" :key="b.label" type="button" :class="b.cls || undefined" @click="b.fn()">{{ b.label }}</button><button v-if="S.moves.length >= 8" type="button" id="resLesson" @click="startLesson()">跟{{ persona().name }}复盘</button><button v-else type="button" @click="reviewAfterGame()">复盘本局</button><div class="res-links"><button type="button" class="linkish" @click="hideResult()">先看看棋盘</button><button v-if="S.moves.length >= 8" type="button" class="linkish" @click="reviewAfterGame()">自己复盘</button><button type="button" class="linkish" @click="home">回主页</button></div></div>
      </template>
    </div>
  </div>
</template>
