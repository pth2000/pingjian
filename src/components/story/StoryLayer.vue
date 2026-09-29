<script setup>
/* 剧情浮层：最后一步、故事、建角色、调试面板。用 Reka UI 的 Dialog：焦点锁在卡片里、Esc 收起、读屏知道这是对话框。
   点背景或按 Esc 收起；带 lock 的（建第一个角色、最后一步还没选）收不起来。 */
import { computed } from 'vue';
import { DialogContent, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { ui } from '../../stores/ui.js';
import { stClose } from '../../story/story.js';
import BondCard from './BondCard.vue';
import TaleCard from './TaleCard.vue';
import CreateCard from './CreateCard.vue';
import DebugPanel from './DebugPanel.vue';

const L = ui.layer;
const lock = computed(() => / lock\b/.test(' ' + L.cls));
const TITLE = { bond: '最后一步', tale: '故事', create: '建一个角色', dbg: '调试面板' };
function onEsc(e) { if (lock.value) e.preventDefault(); }
</script>

<template>
  <DialogRoot :open="!!L.kind" @update:open="o => !o && !lock && stClose()">
    <DialogPortal>
      <DialogContent id="stLayer" :class="'st-layer ' + L.cls" :aria-describedby="undefined" @escape-key-down="onEsc" @pointer-down-outside.prevent @open-auto-focus.prevent @close-auto-focus.prevent @click.self="!lock && stClose()">
        <DialogTitle class="sr-only">{{ TITLE[L.kind] || '剧情' }}</DialogTitle>
        <div v-if="L.kind" :key="L.seq" class="st-card">
          <BondCard v-if="L.kind === 'bond'" :ev="L.data"/>
          <TaleCard v-else-if="L.kind === 'tale'" :d="L.data"/>
          <CreateCard v-else-if="L.kind === 'create'" :can-cancel="L.data.canCancel"/>
          <DebugPanel v-else-if="L.kind === 'dbg'"/>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
