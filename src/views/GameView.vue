<script setup>
/* 对弈页。
   电脑：左边棋盘（最大 720），右栏是对局卡、局势和陪练、棋谱 / 数据 / 设置、常用按钮。
         棋盘占不满高度时（偏方的屏、大屏），对局卡挪到棋盘上面，再有空，陪练挪到棋盘下面（gv.room，canvas.js 的 layout() 算）。
   手机：顶栏里是窄版对局卡；下面一行局势或陪练（固定高度）、棋盘占满宽；按钮固定在底部，棋谱 / 数据 / 设置从底部拉出来。
   棋盘画在 canvas 上（ui/canvas.js），边长跟着 .board-wrap 这个容器走。 */
import { gv } from '../stores/game-ui.js';
import { boardDown, boardLeave, boardMove, boardUp, closeSheet, togglePanel } from '../ui/input.js';
import { go } from '../ui/views.js';
import MatchCard from '../components/game/MatchCard.vue';
import GameHud from '../components/game/GameHud.vue';
import IntroCard from '../components/game/IntroCard.vue';
import ResultCard from '../components/game/ResultCard.vue';
import NigiriCard from '../components/game/NigiriCard.vue';
import OpeningCard from '../components/game/OpeningCard.vue';
import ReviewBar from '../components/game/ReviewBar.vue';
import ActionBar from '../components/game/ActionBar.vue';
import SidePanel from '../components/game/SidePanel.vue';
import { ChevronLeft, PanelRight } from 'lucide-vue-next';
</script>

<template>
  <main class="layout gm" :class="'room' + gv.room">
    <div class="gm-top">
      <button type="button" class="ghost gm-back" aria-label="回主页" @click="go('home')"><ChevronLeft class="ic" aria-hidden="true"/></button>
      <MatchCard compact/>
      <button type="button" class="ghost gm-more" aria-label="棋谱、数据和设置" @click="togglePanel()"><PanelRight class="ic" aria-hidden="true"/></button>
    </div>
    <section class="gm-stage" id="gmStage">
      <MatchCard v-if="gv.room >= 1" class="above"/>
      <div class="board-wrap" id="boardWrap">
        <div class="frame" id="frame">
          <canvas id="board" tabindex="0" aria-label="棋盘：方向键移动光标，回车落子" @pointermove="boardMove" @pointerleave="boardLeave" @pointerdown="boardDown" @pointerup="boardUp"></canvas>
          <canvas id="hoverLayer" aria-hidden="true"></canvas>
          <IntroCard/>
          <ResultCard/>
          <NigiriCard/>
          <OpeningCard where="board"/>
        </div>
      </div>
      <MatchCard meta-only class="gm-meta"/><GameHud v-if="gv.room >= 2" class="below"/>
    </section>
    <aside class="gm-side">
      <MatchCard v-if="gv.room < 1" class="in-side"/>
      <GameHud v-if="gv.room < 2"/>
      <SidePanel/>
      <div class="gm-foot"><ReviewBar/><ActionBar/></div>
    </aside>
    <div class="scrim" id="scrim" :hidden="!gv.sheet" @click="closeSheet()"></div>
  </main>
</template>
