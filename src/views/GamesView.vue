<script setup>
/* 棋谱：下完的对局，按胜负 / 双人筛选；点一局载入复盘（有没下完的棋时先确认） */
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
import { computed, onUnmounted, ref } from 'vue';
import { ui } from '../stores/ui.js';
import { HIST, LEVEL_FULL } from '../ui/state.js';
import MiniBoard from '../components/MiniBoard.vue';
import { openingOf } from '../openings/openings.js';
import { opLabel } from '../openings/tree.js';
import { openHist, updateUI } from '../ui/panel.js';
import { ask, toast } from '../ui/dialogs.js';
import { save } from '../core/storage.js';
import { rulesetLabel } from '../game/rulesets.js';
import { go } from '../ui/views.js';

const FILTERS = [['all', '全部'], ['w', '胜局'], ['l', '负局'], ['pvp', '双人']];
const F = { all: () => true, w: x => x.r === 'w', l: x => x.r === 'l', pvp: x => x.lv === 'pvp' };
const RT = { w: ['胜', 'w'], l: ['负', 'l'], d: ['和', 'd'], b: ['黑胜', 'p'], wh: ['白胜', 'p'] };
const filter = ref('all'), shown = ref(24);

const v = computed(() => {
  if (!ui.booted) return null;
  const all = HIST.filter(x => Array.isArray(x.m) && x.m.length).slice().reverse();
  const byLv = ui.gamesLv ? all.filter(x => x.lv === ui.gamesLv) : all;
  const list = byLv.filter(F[filter.value] || F.all);
  return {
    total: all.length, lvName: ui.gamesLv ? `对阵${LEVEL_FULL[ui.gamesLv] || ''}` : '',
    more: list.length > shown.value,
    empty: all.length ? '没有符合条件的对局。' : '下完的对局会自动保存在这里，点开就能在棋盘上复盘。',
    list: list.slice(0, shown.value).map(x => {
      const [txt, cls] = RT[x.r] || ['和', 'd'];
      const who = (x.adv || x.story) ? `闯关（旧版）· ${LEVEL_FULL[x.lv] || ''}` : x.lv === 'pvp' ? '双人对弈' : `<i class="sw ${x.h === 1 ? 'b' : 'w'}" title="${x.h === 1 ? '执黑' : '执白'}"></i>对阵${LEVEL_FULL[x.lv] || ''}`;
      const d = new Date(x.t), op = openingOf(x.m);
      return {
        t: x.t, txt, cls, who, moves: x.m,
        sub: `${x.n} 手${x.rs ? ` · ${x.lv === 'pvp' ? (x.rs === 1 ? '黑方' : '白方') : ''}认输` : ''}${op ? ` · ${opLabel(op)}` : ''}${x.rule && (x.rule !== 'renju' || x.or) ? ' · ' + rulesetLabel(x.rule, x.or) : ''}`,
        day: `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      };
    }),
  };
});

const open = t => openHist(t);
onUnmounted(() => { ui.gamesLv = ''; });
async function clear() {
  if (!(await ask({ title: '清空历史棋局？', text: '保存的所有棋谱都会被删除，之后无法再复盘。战绩统计不受影响。此操作无法撤销。', ok: '清空', danger: true }))) return;
  HIST.forEach(x => { delete x.m; delete x.wr; });
  save('hist', HIST);
  updateUI(); toast('历史棋局已清空');
}
</script>

<template>
  <section class="view v-games page" data-v="games" aria-label="棋谱">
    <PageHeader title="棋谱" :sub="v?.total ? `下完的对局都在这里，共 ${v.total} 局。点一局在棋盘上复盘。` : '下完的对局都在这里，点一局在棋盘上复盘。'"><button v-if="v?.total" type="button" class="btn ghost sm" id="btnClearGames" @click="clear">清空</button></PageHeader>
    <template v-if="v">
      <EmptyState v-if="!v.total" title="还没有棋谱" text="每一盘下完都会自动存在这里，点开就能在棋盘上一手一手复盘，看胜率怎么变、哪一手下坏了。"><button type="button" class="btn accent" @click="go('setup')">去下一盘</button></EmptyState>
      <template v-else>
        <div class="gm-bar"><div class="gm-filter" id="gmFilter" role="group" aria-label="筛选"><button v-for="[f, label] in FILTERS" :key="f" type="button" :data-f="f" :aria-pressed="String(f === filter)" @click="filter = f">{{ label }}</button></div>
          <button v-if="v.lvName" type="button" class="chip ink gm-lv" id="gmLv" title="看全部对手" @click="ui.gamesLv = ''">{{ v.lvName }}<span aria-hidden="true">×</span></button></div>
        <div class="games" id="games"><template v-if="v.list.length"><button v-for="g in v.list" :key="g.t" type="button" class="gcard card" :data-t="g.t" @click="open(g.t)"><MiniBoard :moves="g.moves"/><span class="gi"><span class="gres" :class="g.cls">{{ g.txt }}</span><b v-html="g.who"></b><small>{{ g.sub }}</small><small>{{ g.day }}</small></span></button></template><p v-else class="none">{{ v.empty }}</p></div>
        <button type="button" class="btn" id="gamesMore" :hidden="!v.more" @click="shown += 20">显示更多</button>
      </template>
    </template>
  </section>
</template>
