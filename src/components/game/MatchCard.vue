<script setup>
/* 对局卡：双方并排——左边是你（双人对弈时是黑棋），右边是对手，中间一个「对」字；最下面一行是第几手、用时、形势；
   下面一根胜率条，左右两段就是双方各自的份额，颜色跟着各自的棋子。
   轮到谁，谁那边就亮起来；下完了，赢的一方盖一个「胜」字。点对手那边打开设置换人。
   compact：手机顶栏里的窄版，只留头像、名字和一根细胜率条。metaOnly：只要最下面那一行（手机上放在棋盘下面）。 */
import { computed } from 'vue';
import { ui } from '../../stores/ui.js';
import { gv } from '../../stores/game-ui.js';
import { DIFF_NAME, OPP, S, diffOf, elapsed, fmtTime, oppOf } from '../../ui/state.js';
import { PVP, toMove } from '../../ui/sound.js';
import { wrView } from '../../game/view.js';
import { openingView } from '../../game/opening-rule.js';
import { playerG, playerName } from '../../story/story.js';
import { PROFILE } from '../../core/profile.js';
import { changeSetup } from '../../ui/input.js';
import Avatar from '../Avatar.vue';

defineProps({ compact: Boolean, metaOnly: Boolean });
const v = computed(() => {
  if (!ui.booted) return null;
  gv.clock;
  const pvp = PVP(), L = pvp ? 1 : S.human, live = !S.over && S.review < 0 && !gv.nigiri;
  const side = c => {
    const o = { c, turn: live && toMove() === c, won: S.over && S.winner === c && S.review < 0, state: '', think: false };
    if (pvp) Object.assign(o, { name: c === 1 ? '黑棋' : '白棋', sub: c === 1 ? '先行' : '后行', stone: true, state: o.turn ? '落子' : '' });
    else if (c === S.human) Object.assign(o, { player: PROFILE.cur ? playerG() : 'm', name: PROFILE.cur ? playerName() : '你', sub: `执${c === 1 ? '黑先行' : '白后行'}`, think: o.turn && S.thinking, state: o.turn ? (S.thinking ? '分析中' : '轮到你') : '' });
    else { const op = OPP[oppOf(S.level)]; Object.assign(o, { id: op.id, opp: true, name: op.name, sub: `${op.tag} · ${DIFF_NAME[diffOf(S.level)]}${S.randOpp ? ' · 随机' : ''}`, think: o.turn && !S.pending, state: o.turn ? (S.pending ? '等你定' : '思考中') : '' }); }
    if (S.op && live) {                            // 开局规则还没走完：黑白可能还会换，轮到谁看开局那边
      const ov = openingView(), human = pvp || c === S.human;
      o.sub = '开局阶段'; o.turn = !pvp && (human ? !ov.busy : ov.busy); o.think = !pvp && !human && ov.busy;
      o.state = o.turn ? (human ? '轮到你' : '思考中') : '';
    }
    return o;
  };
  let wr = null;
  if (S.showWR) {
    const w = wrView(); let cur = w.cur, verdict = w.verdict;
    if (S.review >= 0) { cur = w.ser[Math.min(S.review, w.ser.length - 1)]; verdict = S.review ? `第 ${S.review} 手后` : '开局'; }
    const l = L === 1 ? cur : 100 - cur;
    wr = { l, lp: Math.round(l), rp: 100 - Math.round(l), verdict };
  }
  return { left: side(L), right: side(3 - L), wr, n: S.review >= 0 ? `复盘 ${S.review} / ${S.moves.length}` : `第 ${S.moves.length + (S.over ? 0 : 1)} 手`, time: fmtTime(elapsed()), cont: !!S.settled && !S.over && S.review < 0 && !S.op };
});
</script>

<template>
  <p v-if="v && metaOnly" class="mc-meta solo"><span class="num">{{ v.n }}</span><i>·</i><span class="num">{{ v.time }}</span><template v-if="v.wr"><i>·</i><span>{{ v.wr.verdict }}</span></template><template v-if="v.cont"><i>·</i><span class="mc-cont">续下 · 不计战绩</span></template></p>
  <div v-else-if="v" class="match" :class="{ compact }" id="vsChip">
    <template v-for="s in [v.left, v.right]" :key="s.c">
      <component :is="s.opp ? 'button' : 'div'" :type="s.opp ? 'button' : undefined" class="mc-side" :class="[s === v.left ? 'l' : 'r', { turn: s.turn, won: s.won, think: s.think, opp: s.opp }]"
        :title="s.opp ? '更改对手、难度或规则' : undefined" @click="s.opp && changeSetup()">
        <span class="mc-av"><span v-if="s.stone" class="ps-stone" :class="s.c === 1 ? 'b' : 'w'"></span><Avatar v-else-if="s.id" :id="s.id" :size="compact ? 32 : 44"/><Avatar v-else :player="s.player" :size="compact ? 32 : 44"/><i class="ps-c" :class="s.c === 1 ? 'b' : 'w'"></i></span>
        <span class="mc-t"><b>{{ s.name }}</b><small v-if="!compact">{{ s.sub }}</small>
          <span v-if="s.state" class="mc-state"><i></i>{{ s.state }}</span><span v-else-if="s.won" class="ps-won" aria-label="胜">胜</span></span>
      </component>
      <div v-if="s === v.left" class="mc-mid"><span class="mc-vs" aria-hidden="true">对</span></div>
    </template>
    <div v-if="v.wr" class="mc-wr" id="wrBox" role="img" :aria-label="`${v.wr.verdict}：${v.left.name} ${v.wr.lp}%，${v.right.name} ${v.wr.rp}%`">
      <span class="num">{{ v.wr.lp }}%</span>
      <span class="mc-track" :class="'bg-' + (v.right.c === 1 ? 'b' : 'w')"><i :class="v.left.c === 1 ? 'b' : 'w'" :style="{ '--p': v.wr.l + '%' }"></i><em></em></span>
      <span class="num">{{ v.wr.rp }}%</span>
    </div>
    <p v-if="!compact" class="mc-meta"><span class="num">{{ v.n }}</span><i>·</i><span class="num">{{ v.time }}</span><template v-if="v.wr"><i>·</i><span id="wrVerdict">{{ v.wr.verdict }}</span></template><template v-if="v.cont"><i>·</i><span class="mc-cont">续下 · 不计战绩</span></template></p>
  </div>
</template>
