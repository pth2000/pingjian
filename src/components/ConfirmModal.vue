<script setup>
/* 确认弹框：由 ui/dialogs.js 的 ask() 打开。用 Reka UI 的 AlertDialog：焦点锁在框里、Esc 取消、读屏念标题和说明。
   危险操作默认把焦点放在「取消」上。关掉以后焦点回到打开它的那个按钮（dialogs.js 管）。 */
import { ref, watch, nextTick } from 'vue';
import { AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle } from 'reka-ui';
import { ui } from '../stores/ui.js';
import { closeAsk } from '../ui/dialogs.js';

const m = ui.modal;
const textEl = ref(null), okEl = ref(null), cancelEl = ref(null);
watch(() => m.seq, async () => { await nextTick(); if (textEl.value) textEl.value.scrollTop = 0; });
function focusFirst(e) {
  e.preventDefault();
  const input = textEl.value && textEl.value.querySelector('input:not([type=radio]):not([type=checkbox]), textarea');
  (input || (m.danger && m.cancel !== null ? cancelEl.value : okEl.value))?.focus();
}
</script>

<template>
  <AlertDialogRoot :open="m.open" @update:open="o => !o && closeAsk(false)">
    <AlertDialogPortal>
      <AlertDialogOverlay class="modal-ov" id="modal"/>
      <AlertDialogContent :key="m.seq" class="modal-card" :class="{ single: m.cancel === null, 'is-danger': !!m.danger, 'has-alt': !!m.alt }" @open-auto-focus="focusFirst" @close-auto-focus.prevent>
        <span class="modal-seal" aria-hidden="true">弈</span>
        <AlertDialogTitle as="h3" id="mdTitle">{{ m.title || '确认' }}</AlertDialogTitle>
        <AlertDialogDescription as-child>
          <div v-if="m.html" ref="textEl" class="md-text" id="mdText" v-html="m.html"></div>
          <div v-else ref="textEl" class="md-text" id="mdText">{{ m.text }}</div>
        </AlertDialogDescription>
        <div class="modal-acts"><button ref="cancelEl" type="button" id="mdCancel" :hidden="m.cancel === null" @click="closeAsk(false)">{{ m.cancel ?? '取消' }}</button><button v-if="m.alt" type="button" id="mdAlt" @click="closeAsk('alt')">{{ m.alt }}</button><button ref="okEl" type="button" class="primary" id="mdOk" @click="closeAsk(true)">{{ m.ok }}</button></div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
