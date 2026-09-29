<script setup>
/* 头像：对手（id）或玩家（player: 'm' / 'f'；剧情关闭时换成简单的棋子头像）。还不认识的对手显示彩色圆章；id 为 rand 是「随机」的问号。
   画像本身是 portraits.js / player-face.js 画的 SVG（或者画好的图），这里只负责圆形的框。 */
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { oppAvatar, oppFace } from '../story/portraits.js';
import { plainFace, playerFace } from '../story/player-face.js';
import { ST } from '../story/story.js';

const props = defineProps({ id: String, player: String, size: { type: Number, default: 40 }, face: Boolean });
// face：不管认不认识都显示画像（设置页的「随机」一栏、结算卡之类）
const html = computed(() => { ui.booted; return props.player ? (ST.on ? playerFace(props.player) : plainFace()) : props.face ? oppFace(props.id) : oppAvatar(props.id); });
</script>

<template><span class="avatar" :style="{ '--s': size + 'px' }" v-html="html"></span></template>
