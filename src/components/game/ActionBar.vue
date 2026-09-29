<script setup>
/* 常用的按钮：悔棋、提示、认输（下完了不显示）、新局（下完了变成「再来一局」）。电脑在右栏最下面，紧挨棋盘；手机固定在屏幕底部。
   手机上选了点以后，这一行换成微调和「落子」。设置在页签里，这里不再放。 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { actionsView } from '../../game/view.js';
import { askNewGame, cancelSel, nudge, placeSel } from '../../ui/input.js';
import { giveHint, undoMove } from '../../game/coach.js';
import { Flag, Lightbulb, RotateCcw, Undo2 } from 'lucide-vue-next';
import { resign } from '../../game/play.js';

const v = computed(() => { return ui.booted ? actionsView() : null; });
</script>

<template>
  <div class="actions" id="actions">
    <div class="nudge" id="nudgeRow" :hidden="!v?.nudge">
      <button id="nudgeL" type="button" aria-label="左移一格" @click="nudge(-1, 0)">◀</button>
      <button id="nudgeU" type="button" aria-label="上移一格" @click="nudge(0, -1)">▲</button>
      <button id="nudgeD" type="button" aria-label="下移一格" @click="nudge(0, 1)">▼</button>
      <button id="nudgeR" type="button" aria-label="右移一格" @click="nudge(1, 0)">▶</button>
      <button class="primary" id="btnPlace" type="button" @click="placeSel()">{{ v ? v.place : '落子' }}</button>
      <button id="btnCancelSel" type="button" aria-label="取消选点" @click="cancelSel()">✕</button>
    </div>
    <div class="mainrow" id="mainRow" :hidden="!!v?.nudge">
      <button id="btnUndo" type="button" title="悔棋（U）" :disabled="v?.undoOff" @click="undoMove()"><Undo2 class="ic" aria-hidden="true"/>{{ v ? v.undoLabel : '悔棋' }}</button>
      <button id="btnHint" type="button" title="提示（H）" :disabled="v?.hintOff" @click="giveHint()"><Lightbulb class="ic" aria-hidden="true"/>提示</button>
      <button v-if="v?.resign" id="btnResign" type="button" title="认输" :disabled="v?.resignOff" @click="resign()"><Flag class="ic" aria-hidden="true"/>认输</button>
      <button id="btnNew" type="button" title="新对局（N）" :class="{ accent: v?.over }" @click="askNewGame()"><RotateCcw class="ic" aria-hidden="true"/>{{ v?.over ? '再来一局' : '新局' }}</button>
    </div>
  </div>
</template>
