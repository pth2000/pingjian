<script setup>
/* 右栏（手机上是从底部拉出的面板）：棋谱、数据、设置三页。页签用 Reka UI 的 Tabs（键盘左右键切换、读屏都照顾到） */
import { go } from '../../ui/views.js';
import { computed } from 'vue';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { S, elapsed, fmtTime } from '../../ui/state.js';
import { narrow } from '../../ui/sound.js';
import { blunderList, recView } from '../../game/view.js';
import { enterReview } from '../../game/review.js';
import { canLesson, startLesson } from '../../game/lesson.js';
import { persona } from '../../game/coach.js';
import { closeSheet, copyCode, loadCode, setTab, toggleReview } from '../../ui/input.js';
import SettingsForm from './SettingsForm.vue';
import WinRateChart from './WinRateChart.vue';
import PerfBlock from './PerfBlock.vue';
import MoveLog from './MoveLog.vue';
import { X } from 'lucide-vue-next';

const TABS = [['log', '棋谱'], ['data', '数据'], ['set', '设置']];
const tab = computed({ get: () => gv.tab, set: t => setTab(t) });
const d = computed(() => { return ui.booted ? { n: S.moves.length, rec: recView(), blunders: blunderList() } : null; });
const time = computed(() => { gv.clock; return ui.booted ? fmtTime(elapsed()) : '0:00'; });
const closeOnPhone = () => { if (narrow()) closeSheet(); };
const pickBlunder = k => { enterReview(k); closeOnPhone(); };
const lesson = () => { closeOnPhone(); startLesson(); };
// 面板里的操作做完就把面板收起来，免得挡着棋盘
const later = fn => () => { fn(); if (narrow()) setTimeout(closeSheet, 150); };
</script>

<template>
  <aside class="panel" id="panel">
    <TabsRoot v-model="tab" :unmount-on-hide="false" class="pn-tabs">
      <div class="sheet-head">
        <TabsList class="tabs" id="tabs" aria-label="棋谱、数据、设置">
          <TabsIndicator class="tabs-ind"/>
          <TabsTrigger v-for="[t, label] in TABS" :key="t" :value="t" :data-tab="t">{{ label }}</TabsTrigger>
        </TabsList>
        <button class="ghost sheet-close" id="sheetClose" type="button" aria-label="关闭面板" @click="closeSheet()"><X class="ic" aria-hidden="true"/></button>
      </div>

      <TabsContent value="log" class="pn-page">
        <MoveLog id="log" @pick="closeOnPhone"/>
        <div v-if="d?.blunders.length" class="pn-sec" id="fsBlunder">
          <p class="eyebrow pn-eh">复盘要点<button v-if="canLesson() && !S.lesson" type="button" class="linkish" id="btnLesson" @click="lesson">跟{{ persona().name }}看一遍 ›</button></p>
          <div class="blunders" id="blunders"><button v-for="x in d?.blunders" :key="x.k" type="button" @click="pickBlunder(x.k)"><span>第 {{ x.k + 1 }} 手 {{ x.who }} {{ x.at }}</span><span class="tag">{{ x.tag }}</span></button></div>
        </div>
        <div class="pn-sec">
          <div class="share">
            <button id="btnReview" type="button" class="btn sm" :disabled="!d?.n" @click="later(toggleReview)()">{{ S.review >= 0 ? '退出复盘' : '复盘本局' }}</button>
            <button id="btnCopy" type="button" class="btn sm" @click="later(copyCode)()">复制棋谱代码</button>
            <input id="codeIn" placeholder="粘贴棋谱代码，回车载入" aria-label="棋谱代码" @keydown.enter="loadCode($event)">
          </div>
          <button type="button" class="linkish log-more" @click="go('games')">历史棋局都在「棋谱」里 ›</button>
        </div>
      </TabsContent>

      <TabsContent value="data" class="pn-page">
        <WinRateChart/>
        <div class="live">
          <div><b id="liveMoves">{{ d ? d.n : 0 }}</b>本局手数</div>
          <div><b id="liveTime">{{ time }}</b>本局用时</div>
          <div><b id="liveStreak">{{ d ? d.rec.streak : 0 }}</b><span id="lblStreak">{{ d ? d.rec.ls : '当前连胜' }}</span></div>
        </div>
        <PerfBlock/>
        <div class="pn-sec">
          <p class="eyebrow" id="recCap">{{ d ? d.rec.cap : '' }}</p>
          <div class="rec">
            <div><b id="recW">{{ d ? d.rec.w : 0 }}</b><small id="lblW">{{ d ? d.rec.lw : '胜' }}</small></div>
            <div><b id="recL">{{ d ? d.rec.l : 0 }}</b><small id="lblL">{{ d ? d.rec.ll : '负' }}</small></div>
            <div><b id="recD">{{ d ? d.rec.d : 0 }}</b><small>和</small></div>
            <div><b id="recRate">{{ d ? d.rec.rate : '–' }}</b><small id="lblRate">{{ d ? d.rec.lr : '胜率' }}</small></div>
          </div>
          <p class="rec-foot" id="recFoot" v-html="d?.rec.foot"></p>
        </div>
      </TabsContent>

      <TabsContent value="set" class="pn-page">
        <SettingsForm/>
      </TabsContent>
    </TabsRoot>
  </aside>
</template>
