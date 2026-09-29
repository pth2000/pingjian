<script setup>
/* 开局规则、局势和陪练：复盘讲解、失误提醒、陪练的话、局势一行、请陪练。电脑上棋盘下面有空时放在棋盘下面，否则在右栏 */
import CoachGuard from './CoachGuard.vue';
import CoachSay from './CoachSay.vue';
import NoticeLine from './NoticeLine.vue';
import LessonCard from './LessonCard.vue';
import OpeningCard from './OpeningCard.vue';
</script>

<template>
  <div class="hud" id="hud"><OpeningCard/><LessonCard/><CoachGuard/><CoachSay/><NoticeLine/></div>
</template>
