<script setup>
/* 对弈页的「设置」：本局设置只列出来看（要改就去设置页，下一局生效），这里能改的是显示和陪练，随时生效。 */
import { computed } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';
import { ui } from '../../stores/ui.js';
import { DIFF_NAME, OPP, S, diffOf, oppOf } from '../../ui/state.js';
import { PVP } from '../../ui/sound.js';
import { COACHES, persona } from '../../game/coach.js';
import { changeSetup, setCoach } from '../../ui/input.js';
import { onCoachPick, onGuard, onShowNum, onShowThreat, onShowWR, onSound } from '../../ui/settings.js';
import { rulesetNow } from '../../game/rulesets.js';
import { RULE_NAME } from '../../game/opening-rule.js';
import Segmented from '../Segmented.vue';
import Toggle from '../Toggle.vue';
import CoachFace from './CoachFace.vue';
import { SWAP_OPENS } from '../../game/rulesets.js';

const s = computed(() => {
  if (!ui.booted) return null;
  const pvp = PVP(), rs = rulesetNow(), op = SWAP_OPENS.has(rs.open);
  const rows = pvp
    ? [['模式', '双人对弈'], ['规则', rs.short], ['猜先', S.nigiri !== false ? (op ? '开局前猜先，猜中者为假先方' : '开局前猜先，猜中者执黑') : '不猜先']]
    : [['对手', S.randOpp ? `${OPP[oppOf(S.level)].name}（每局随机）` : OPP[oppOf(S.level)].name], ['难度', DIFF_NAME[diffOf(S.level)]], ['规则', rs.short],
      op ? ['开局顺序', `${RULE_NAME[rs.open]} · ${S.opFirst === 'opp' ? '对手先摆' : '我先摆'}`] : ['执子', (S.side || S.human) === 1 ? '执黑先行' : '执白后行']];
  if (rs.rule === 'renju' && S.hideForb) rows.push(['禁手点', '隐藏（落在禁手点即判负）']);
  return {
    pvp, rows,
    showNum: !!S.showNum, sound: !!S.sound, showWR: !!S.showWR, showThreat: !!S.showThreat, coach: !!S.coach, guard: String(S.guard | 0),
    coaches: COACHES, coachId: persona().id, coachDesc: persona().desc || '',
  };
});
// 失误提醒（S.guard）：陪练在对手应棋之前先暂停，说明这手的问题，可以撤回重下
const GUARDS = [{ value: '0', label: '关闭' }, { value: '1', label: '仅致命失误' }, { value: '2', label: '所有明显失误' }];
const GUARD_NOTE = {
  0: '不打断对局，由陪练在落子后点评。',
  1: '落子后将直接输棋，或错过了连续冲四的胜机时，先暂停并说明，可撤回重下；其余着法落子后点评。',
  2: '胜率明显下降的着法也会先暂停并说明，可撤回重下。',
};
const pickCoach = id => { if (id && id !== s.value.coachId) onCoachPick(id); };
</script>

<template>
  <div v-if="s" class="setwrap" id="setWrap">
    <section class="set-sec" aria-label="本局设置">
      <p class="eyebrow">本局设置</p>
      <dl class="set-sum" id="setSum"><template v-for="[k, v] in s.rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></template></dl>
      <button type="button" class="btn sm" id="setChange" @click="changeSetup()">更改设置</button>
      <p class="hint-text">更改后从下一局开始生效。</p>
    </section>

    <section class="set-sec" aria-label="显示">
      <p class="eyebrow">显示</p>
      <Toggle id="showWR" :model-value="s.showWR" label="实时胜率" note="棋盘旁边的胜率条和数据页的走势" @update:model-value="onShowWR"/>
      <Toggle id="showThreat" :model-value="s.showThreat" label="威胁提示" note="活三、冲四时提醒，并标出要挡的点" @update:model-value="onShowThreat"/>
      <Toggle id="showNum" :model-value="s.showNum" label="显示手数" @update:model-value="onShowNum"/>
      <Toggle id="sound" :model-value="s.sound" label="落子音效" @update:model-value="onSound"/>
    </section>

    <section class="set-sec" aria-label="陪练">
      <p class="eyebrow">陪练</p>
      <Toggle id="coach" :model-value="s.coach" label="陪练解说" note="在旁边讲每一手，下完帮你复盘" @update:model-value="setCoach"/>
      <template v-if="s.coach">
        <ToggleGroupRoot type="single" class="set-coaches" id="coachPick" :model-value="s.coachId" aria-label="选择陪练" @update:model-value="pickCoach">
          <ToggleGroupItem v-for="c in s.coaches" :key="c.id" :value="c.id" class="set-coach"><CoachFace :pc="c"/><span>{{ c.name }}</span><small v-if="c.title">{{ c.title }}</small></ToggleGroupItem>
        </ToggleGroupRoot>
        <p class="hint-text" id="coachDesc">{{ s.coachDesc }}</p>
        <div v-if="!s.pvp" class="set-field" id="coachGuard"><b>失误提醒</b><Segmented :model-value="s.guard" :options="GUARDS" label="失误提醒" @update:model-value="onGuard"/><p class="hint-text">{{ GUARD_NOTE[s.guard] }}</p></div>
      </template>
    </section>
  </div>
</template>
