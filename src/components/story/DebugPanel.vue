<script setup>
/* 调试面板（彩蛋）：改当前角色的剧情数据，模拟下棋，跳到各页看效果。按钮的动作在 features/debug.js 的 dbgClick() */
import { computed } from 'vue';
import { PROFILE } from '../../core/profile.js';
import { OPP_COL } from '../../ui/state.js';
import { OPPONENTS } from '../../engine/engine.js';
import { STAGES, STORY } from '../../story/story-data.js';
import { arcOf, bondName } from '../../story/bonds.js';
import { ST, playerG, stClose, stageOf } from '../../story/story.js';
import { oppAvatar } from '../../story/portraits.js';
import { ACH, ACHS } from '../../features/achievements.js';
import { dbgClick } from '../../features/debug.js';

const v = computed(() => {
  return {
    who: (PROFILE.cur || {}).name || '—', g: playerG() === 'f' ? '红袖（f）' : '青衫（m）', on: ST.on, total: ST.total,
    bonds: OPPONENTS.filter(o => ST.bond[o.id]).map(o => `${o.name}·${bondName(o.id)}`).join(' ') || '—',
    ach: `${ACHS.filter(a => ACH.got[a.id]).length}/${ACHS.length}`, stages: [1, 2, 3, 4].map(s => STAGES[s]), zhiji: STAGES[4].n,
    rows: OPPONENTS.map(o => { const c = ST.cnt[o.id] || 0; return { id: o.id, name: o.name, col: OPP_COL[o.id], face: oppAvatar(o.id), stage: STAGES[stageOf(o.id)].k, c, arc: `${arcOf(o.id)}/${STORY[o.id].arc.steps.length}`, heard: (ST.heard[o.id] || []).length }; }),
    json: JSON.stringify(ST, null, 1),
  };
});
</script>

<template>
  <div id="dbgBody" @click="dbgClick"><div class="dbg-hd"><b>调试面板</b><small>改的是角色「{{ v.who }}」的数据</small><button type="button" class="dbg-x" aria-label="关闭" @click="stClose()">×</button></div>
    <div class="dbg-st">
      <span>模样 <b>{{ v.g }}</b> <button data-d="g">换</button></span>
      <span>剧情 <b>{{ v.on ? '开' : '关' }}</b> <button data-d="on">{{ v.on ? '关掉' : '打开' }}</button></span>
      <span>总盘数 <b>{{ v.total }}</b></span>
      <span>羁绊 <b>{{ v.bonds }}</b> <button data-d="unbond">清除</button></span>
      <span>成就 <b>{{ v.ach }}</b> <button data-d="achAll">全解锁</button><button data-d="achNone">清空</button></span>
    </div>
    <div class="dbg-tw"><table class="dbg-t"><tbody><tr><th>熟客</th><td>交情</td><td>改盘数（按规则升段）</td><td>模拟一盘</td><td>剧情</td></tr><tr v-for="o in v.rows" :key="o.id" :style="{ '--oc': o.col }"><th><span class="dbg-f" v-html="o.face"></span>{{ o.name }}</th>
      <td><b>{{ o.stage }}</b><small>{{ o.c }} 盘 · 故事 {{ o.arc }} · 听过 {{ o.heard }}</small></td>
      <td class="dbg-bt"><button data-d="cnt" :data-id="o.id" :data-n="o.c - 1">−1</button><button data-d="cnt" :data-id="o.id" :data-n="o.c + 1">+1</button><button data-d="cnt" :data-id="o.id" :data-n="o.c + 5">+5</button><button v-for="s in v.stages" :key="s.k" data-d="cnt" :data-id="o.id" :data-n="s.n">{{ s.k }}</button><button data-d="cnt" :data-id="o.id" data-n="0">清零</button></td>
      <td class="dbg-bt"><button data-d="game" :data-id="o.id" data-o="win">赢</button><button data-d="game" :data-id="o.id" data-o="lose">输</button><button data-d="game" :data-id="o.id" data-o="draw">和</button></td>
      <td class="dbg-bt"><button data-d="arc" :data-id="o.id">故事</button><button data-d="final" :data-id="o.id">最后一步</button><button data-d="love" :data-id="o.id">恋人</button><button data-d="hear" :data-id="o.id">听全</button></td></tr></tbody></table></div>
    <div class="dbg-acts">
      <button data-d="hearAll">所有人听全台词</button><button data-d="unhear">清空听过的话</button>
      <button data-d="all" :data-n="v.zhiji">六人都到知己</button>
      <button data-d="nav" data-v="notes">看札记</button><button data-d="nav" data-v="setup">看选人页</button><button data-d="nav" data-v="profile">看「我的」</button>
      <button data-d="reset" class="dbg-warn">重置剧情数据</button>
    </div>
    <details class="dbg-raw"><summary>当前剧情数据（JSON）</summary><pre>{{ v.json }}</pre></details>
    <p class="dbg-fine">模拟一盘会走真实的结算流程（交情、故事都照规则算），只是不记战绩和棋谱。<button type="button" class="linkish" data-d="off">关闭调试模式</button></p></div>
</template>
