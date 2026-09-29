<script setup>
/* 人机对弈设置页：左边选对手，中间是对手档案，下面选难度、规则和执子（用开局规则时选开局顺序），最后开始对局。
   选择记在 stores/ui.js 的 setupSel 里（每次进页由 views.js 的 renderSetup() 重置），startAI() 按它开局。 */
import PageHeader from '../components/PageHeader.vue';
import { ArrowLeft } from 'lucide-vue-next';
import Segmented from '../components/Segmented.vue';
import Toggle from '../components/Toggle.vue';
import { computed } from 'vue';
import { ui, setupSel as sel } from '../stores/ui.js';
import { DIFFS, OPPONENTS } from '../engine/engine.js';
import { DIFF_NAME, DIFF_NOTE, HIST, OPP, OPP_COL, REC, S } from '../ui/state.js';
import { oppArt, oppAvatar, oppFace, oppKnown } from '../story/portraits.js';
import { oppRec, startAI, startPvp, go } from '../ui/views.js';
import { openHist } from '../ui/panel.js';
import MiniBoard from '../components/MiniBoard.vue';
import { hfSet } from '../features/hide-forbidden.js';
import { STORY } from '../story/story-data.js';
import { ST, stFill } from '../story/story.js';
import { inProgress } from '../ui/settings.js';
import { rulesetById, rulesetLabel } from '../game/rulesets.js';
import RulePicker from '../components/RulePicker.vue';
import { SWAP_OPENS } from '../game/rulesets.js';
import { hasOwnMove } from '../game/new-game.js';

const rs = computed(() => rulesetById(sel.ruleSet));

const diffs = DIFFS.map(k => ({ k, name: DIFF_NAME[k] }));
const avatar = id => oppAvatar(id);
const pvp = computed(() => sel.mode === 'pvp');
// 双人战绩：黑胜 / 白胜 / 和、连胜、最近四局
const pv = computed(() => {
  const q = REC.pvp || { b: 0, w: 0, d: 0, run: 0 };
  const recent = HIST.filter(x => x.lv === 'pvp' && Array.isArray(x.m) && x.m.length).slice(-4).reverse().map(x => {
    const d = new Date(x.t);
    return { t: x.t, m: x.m, res: x.r === 'b' ? '黑方胜' : x.r === 'wh' ? '白方胜' : '和棋', sub: `${x.n} 手 · ${rulesetLabel(x.rule, x.or)} · ${d.getMonth() + 1}月${d.getDate()}日` };
  });
  return { tiles: [['黑方胜', q.b], ['白方胜', q.w], ['和棋', q.d]], run: q.run >= 2 ? `${q.runColor === 1 ? '黑方' : '白方'}当前 ${q.run} 连胜` : '', recent };
});
// 有一局在进行（或刚下完）：可以不改设置，直接回到那一局
// 只有没下完的对局才给「返回对局」（下完的、刚开还没落子的都不算）
const back = computed(() => (ui.booted && !S.over && (S.op ? S.moves.length > 1 : hasOwnMove()) ? '返回对局' : ''));
const MODES = [{ value: 'ai', label: '人机对弈' }, { value: 'pvp', label: '双人对弈' }];
const start = () => (pvp.value ? startPvp({ ruleSet: sel.ruleSet, nigiri: sel.nigiri }) : startAI());
const setHf = v => hfSet(v);

// 左边名单
const roster = computed(() => {
  return OPPONENTS.map(o => {
    const r = oppRec(o.id);
    return { id: o.id, name: o.name, tag: o.tag, col: OPP_COL[o.id], face: oppAvatar(o.id), rec: r.w + r.l ? `${r.w}<i>胜</i>${r.l}<i>负</i>` : '<em>未交手</em>' };
  });
});

// 中间的档案：只放要紧的——名字、一句话、棋路；交情、来历和心事都在札记里
const dz = computed(() => {
  const id = sel.opp;
  if (id === 'rand') return { rand: true, col: '#6A655C', face: oppFace('rand'), meet: OPPONENTS.map(o => ({ name: o.name, face: oppAvatar(o.id) })) };
  const o = OPP[id], p = STORY[id], c = ST.cnt[id] || 0, r = oppRec(id);
  const known = oppKnown(id) && ST.on;
  return {
    rand: false, col: OPP_COL[id], face: oppAvatar(id), name: o.name,
    k: `${o.tag} · ${c || r.w + r.l ? `交手 ${r.w} 胜 ${r.l} 负` : '还没交过手'}`,
    known, title: p.title, motto: stFill(p.motto, id), style: p.style,
    full: oppKnown(id) ? oppArt(id, 'f') : '',
  };
});

// 底部一行：对阵谁、什么设置
const sum = computed(() => {
  const o = sel.opp;
  if (sel.mode === 'pvp') return {
    name: '双人对弈', face: '<span class="su-pvp"><i class="b"></i><i class="w"></i></span>', hf: !!S.hideForb, note: '',
    sub: `${rs.value.short} · ${sel.nigiri ? '开局前猜先' : '不猜先'}${rs.value.rule === 'renju' && S.hideForb ? ' · 隐藏禁手点' : ''}`,
    warn: inProgress() ? '开始后，没下完的那局会直接结束' : '',
  };
  return {
    name: o === 'rand' ? '随机对手' : (OPP[o] ? '对阵 ' + OPP[o].name : ''),
    face: oppAvatar(o || 'rand'),
    sub: `${DIFF_NAME[sel.diff] || ''} · ${rs.value.short} · ${SWAP_OPENS.has(rs.value.open) ? (sel.first === 'opp' ? '对手先摆' : '我先摆') : sel.side === '2' ? '执白后行' : '执黑先行'}${rs.value.rule === 'renju' && S.hideForb ? ' · 隐藏禁手点' : ''}`,
    warn: inProgress() ? '开始后，没下完的那局会直接结束' : '',
    hf: !!S.hideForb,
    note: DIFF_NOTE[sel.diff] || '',
  };
});
</script>

<template>
  <section class="view v-setup page" data-v="setup" id="vSetup" :aria-label="pvp ? '双人对弈' : '人机对弈'">
    <PageHeader :title="pvp ? '双人对弈' : '人机对弈'" :sub="pvp ? '两人在同一台设备上轮流落子' : '挑一位对手，定好难度、规则和执子'"/>
    <div class="su-top">
      <div class="su-mode"><Segmented v-model="sel.mode" id="suMode" label="模式" :options="MODES"/></div>
      <button v-if="back" type="button" class="btn su-back" id="suBack" @click="go('game')"><ArrowLeft class="ic" aria-hidden="true"/>{{ back }}</button>
    </div>
    <div class="su-wrap" :class="{ pvp }" id="vSetupApp"><template v-if="ui.booted">
      <div v-if="!pvp" class="su-roster" id="suOpps" role="radiogroup" aria-label="对手">
        <label class="su-opp rand" style="--oc:#6A655C"><input type="radio" name="su-opp" value="rand" v-model="sel.opp"><span class="su-face" v-html="avatar('rand')"></span><span class="su-on"><b>随机</b><small>每局换人</small></span><span class="su-rec"></span></label>
        <label v-for="o in roster" :key="o.id" class="su-opp" :style="{ '--oc': o.col }"><input type="radio" name="su-opp" :value="o.id" v-model="sel.opp"><span class="su-face" v-html="o.face"></span>
          <span class="su-on"><b>{{ o.name }}</b><small>{{ o.tag }}</small></span><span class="su-rec" v-html="o.rec"></span></label>
      </div>

      <!-- key：换对手时整块重建，头像的淡入动画每次都放一遍 -->
      <article v-if="!pvp" class="su-dossier" id="suDossier" aria-live="polite" :key="sel.opp" :class="{ 'has-full': !!dz.full }" :style="{ '--oc': dz.col }">
        <template v-if="dz.rand">
          <div class="dz-top"><span class="dz-face" v-html="dz.face"></span><div class="dz-id"><small class="dz-k">对手</small><h3>随机</h3><p class="dz-title">每局换一位，开局才知道是谁</p>
            <div class="dz-meet"><span v-for="x in dz.meet" :key="x.name" :title="x.name" v-html="x.face"></span></div></div></div>
        </template>
        <template v-else>
          <span v-if="dz.full" class="dz-full"><img :src="dz.full" alt="" draggable="false"></span>
          <div class="dz-top"><span class="dz-face" v-html="dz.face"></span><div class="dz-id"><small class="dz-k">{{ dz.k }}</small><h3>{{ dz.name }}</h3>
            <template v-if="dz.known"><p class="dz-title">{{ dz.title }}</p><p class="dz-motto">「<span v-html="dz.motto"></span>」</p></template></div></div>
          <p class="dz-style"><b>棋路</b>{{ dz.style }}</p>
        </template>
      </article>

      <!-- 双人对弈：左边是双人战绩和最近几局，右上是说明，右下是规则和猜先（和人机对弈同一套格子，切换时版面不跳） -->
      <aside v-if="pvp" class="su-roster pv-side" id="pvSide" aria-label="双人战绩">
        <p class="pv-h">双人战绩</p>
        <div class="pv-tiles"><span v-for="t in pv.tiles" :key="t[0]" class="pv-tile"><small>{{ t[0] }}</small><b>{{ t[1] }}</b></span></div>
        <p v-if="pv.run" class="pv-run">{{ pv.run }}</p>
        <p class="pv-h pv-rech">最近对局</p>
        <button v-for="g in pv.recent" :key="g.t" type="button" class="pv-g" @click="openHist(g.t)"><MiniBoard :moves="g.m"/><span><b>{{ g.res }}</b><small>{{ g.sub }}</small></span></button>
        <p v-if="!pv.recent.length" class="pv-none">还没有双人对局。下完的对局会记在这里，点开可以复盘。</p>
      </aside>
      <article v-if="pvp" class="su-dossier pv-dz" id="pvDossier" style="--oc:#6A655C">
        <div class="dz-top"><span class="dz-face pv-face" aria-hidden="true"><i class="b"></i><i class="w"></i></span><div class="dz-id"><small class="dz-k">对坐手谈</small><h3>双人对弈</h3><p class="dz-title">两人在同一台设备上轮流落子</p></div></div>
        <p class="dz-style"><b>陪练</b>只描述局面，不替任何一方支招，也不作失误提醒。</p>
        <p class="dz-style"><b>战绩</b>胜负计入双人战绩，不影响人机对弈的战绩。</p>
      </article>

      <div class="su-opts">
        <div v-if="!pvp" class="su-sec"><h3>难度</h3><Segmented v-model="sel.diff" id="suDiff" label="难度" :options="diffs.map(d => ({ value: d.k, label: d.name }))"/><p class="su-note" id="suDiffNote">{{ sum.note }}</p></div>
        <div class="su-sec" id="suRule"><h3>规则</h3><RulePicker v-model="sel.ruleSet" id-prefix="su"/>
          <div v-if="rs.rule === 'renju'" id="suHideForbRow"><Toggle id="suHideForb" :model-value="sum.hf" label="隐藏禁手点" note="不标出禁手点；黑方落在禁手点即判负，与正式比赛相同" @update:model-value="setHf"/></div></div>
        <div v-if="pvp" class="su-sec"><h3>猜先</h3><Toggle id="suNigiri" v-model="sel.nigiri" label="开局前猜先" :note="!SWAP_OPENS.has(rs.open) ? '一方握子、另一方猜单双，猜中者执黑。' : '一方握子、另一方猜单双，猜中者为假先方。'"/></div>
        <div v-else-if="!SWAP_OPENS.has(rs.open)" class="su-sec"><h3>执子</h3><Segmented v-model="sel.side" label="执子" :options="[{ value: '1', label: '执黑先行' }, { value: '2', label: '执白后行' }]"/></div>
        <div v-else class="su-sec"><h3>开局顺序</h3><Segmented v-model="sel.first" label="开局顺序" :options="[{ value: 'me', label: '我先摆' }, { value: 'opp', label: '对手先摆' }]"/><p class="su-note">先摆的一方为假先方；执黑还是执白，按开局规则确定。</p></div>
        <div class="su-go"><div class="su-sum"><span class="su-sface" id="suSumFace" v-html="sum.face"></span><span class="su-st"><b id="suSumName">{{ sum.name }}</b><small id="suStartSub">{{ sum.sub }}</small><small class="su-warn" id="suWarn">{{ sum.warn }}</small></span></div>
          <button type="button" class="su-btn" id="suStart" @click="start">开始对局<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
      </div>
    </template></div>
  </section>
</template>
