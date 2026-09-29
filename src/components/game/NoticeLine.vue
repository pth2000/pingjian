<script setup>
/* 局势一行：有威胁就提醒（活三、冲四……要挡在哪），否则是提示、禁手判负、刚才落在哪之类的小字。
   轮到谁、谁赢了由上下两条（PlayerStrip）显示，这里不再重复 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { S } from '../../ui/state.js';
import { statusView, threatView } from '../../game/view.js';

const v = computed(() => {
  if (!ui.booted || S.op) return null;              // 开局规则进行中：开局卡里已经说了轮到谁、做什么
  const t = S.review < 0 ? threatView() : null;
  if (t) return { html: t.html, cls: t.mine ? 'mine' : 'foe' };
  const st = statusView();
  if (gv.tapnote && !S.over && S.review < 0 && S.sel >= 0) return { html: '点一下选位，再按「落子」；◀▲▼▶ 可微调', cls: 'quiet' };
  return { html: st.sub || st.main, cls: S.over ? 'end' : 'quiet' };
});
</script>

<template>
  <p v-if="v" class="notice" :class="v.cls" id="threat" aria-live="polite" v-html="v.html"></p>
</template>
