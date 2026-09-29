<script setup>
/* 战绩：人机对弈（生涯合计、近期胜负、对手 × 难度的胜负表）和双人对弈（黑白各胜几盘、胜率、手数、近期结果）分两块 */
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
import Avatar from '../components/Avatar.vue';
import { go } from '../ui/views.js';
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import { DIFF_NAME, HIST, LEVELS, LEVEL_FULL, REC, S } from '../ui/state.js';
import { DIFFS, OPPONENTS } from '../engine/engine.js';
import { oppAvatar } from '../story/portraits.js';
import { ask, toast } from '../ui/dialogs.js';
import { openHist, updateUI } from '../ui/panel.js';
import { STATS, resetRec } from '../ui/state.js';
import { rulesetLabel } from '../game/rulesets.js';

const hasM = x => Array.isArray(x.m) && x.m.length > 0;
// 对手 × 难度的格子：点开看这个组合下过的棋谱
const openLv = k => { ui.gamesLv = k; go('games'); };
const v = computed(() => {
  if (!ui.booted) return null;
  let w = 0, l = 0, d = 0, best = 0;
  for (const k of LEVELS) { const r = REC[k]; if (!r) continue; w += r.w; l += r.l; d += r.d; best = Math.max(best, r.best || 0); }
  const t = w + l + d;
  const AIH = HIST.filter(x => x.lv !== 'pvp' && !x.adv && !x.story && x.t >= STATS.from);
  const side = hc => { const g = AIH.filter(x => x.h === hc); const gw = g.filter(x => x.r === 'w').length; return g.length ? Math.round(gw / g.length * 100) + '%' : '–'; };
  const wins = AIH.filter(x => x.r === 'w');
  const avgWin = wins.length ? Math.round(wins.reduce((a, x) => a + Math.ceil(x.n / 2), 0) / wins.length) : '–';
  const totalMs = AIH.reduce((a, x) => a + (x.ms || 0), 0);
  const dur = ms => ms ? (ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' 小时' : Math.max(1, Math.round(ms / 60000)) + ' 分钟') : '–';
  const hrs = dur(totalMs);
  const TXT = { w: '胜', l: '负', d: '和' };
  const q = REC.pvp, qt = q.b + q.w + q.d;
  // 双人对弈：总数用战绩（REC.pvp），手数、用时、近期结果从棋谱里算
  const PH = HIST.filter(x => x.lv === 'pvp' && x.t >= STATS.from), pms = PH.reduce((a, x) => a + (x.ms || 0), 0);
  const PTXT = { b: '黑', wh: '白', d: '和' }, PNAME = { b: '黑胜', wh: '白胜', d: '和棋' };
  const pvp = qt ? {
    kpis: [['总局数', qt], ['黑胜', q.b], ['白胜', q.w], ['和棋', q.d], ['黑棋胜率', Math.round(q.b / qt * 100) + '%'], ['平均手数', PH.length ? Math.round(PH.reduce((a, x) => a + x.n, 0) / PH.length) : '–']],
    sub: [q.run > 1 ? `${q.runColor === 1 ? '黑' : '白'}棋 ${q.run} 连胜` : '', pms ? `共下了 ${dur(pms)}` : ''].filter(Boolean).join(' · '),
    recent: PH.slice(-24).map(x => ({ t: x.t, has: hasM(x), r: 'p' + x.r, txt: PTXT[x.r] || '和', title: `${new Date(x.t).toLocaleDateString()} · ${x.n} 手 · ${PNAME[x.r] || '和棋'}${hasM(x) ? ' · 点开复盘' : ' · 棋谱已清空'}` })),
  } : null;
  // 按规则：棋规 + 开局规则（预设名称）分开统计，按局数多少排
  const byRule = {};
  for (const x of AIH) { const k = rulesetLabel(x.rule || 'renju', x.or); const r = byRule[k] || (byRule[k] = { name: k, n: 0, w: 0, l: 0, d: 0 }); r.n++; r[x.r] = (r[x.r] || 0) + 1; }
  const rules = Object.values(byRule).sort((a, z) => z.n - a.n).map(r => ({ ...r, rate: Math.round(r.w / r.n * 100) }));
  return {
    rules,
    kpis: [['总对局', t], ['总胜率', t ? Math.round(w / t * 100) + '%' : '–'], ['最长连胜', best], ['执黑胜率', side(1)], ['执白胜率', side(2)], ['获胜平均手数', avgWin]],
    t, hrs: hrs !== '–' ? `共下了 ${hrs}` : '',
    recent: AIH.slice(-24).map(x => ({ t: x.t, has: hasM(x), r: x.r, txt: TXT[x.r], title: `${new Date(x.t).toLocaleDateString()} · 对阵${LEVEL_FULL[x.lv] || ''} · ${x.h === 1 ? '执黑' : '执白'} · ${x.n} 手 · ${TXT[x.r]}${hasM(x) ? ' · 点开复盘' : ' · 棋谱已清空'}` })),
    diffs: DIFFS.map(k => DIFF_NAME[k]),
    heat: OPPONENTS.map(o => ({
      id: o.id, name: o.name, face: oppAvatar(o.id),
      cells: DIFFS.map(df => {
        const k = o.id + '.' + df, r = REC[k], n = r ? r.w + r.l + r.d : 0, rate = n ? r.w / n : 0;
        return {
          k, n, cur: k === S.level, txt: n ? `${r.w}-${r.l}` : '·',
          style: n ? `background:color-mix(in srgb, ${rate >= 0.5 ? 'var(--seal)' : 'var(--ink)'} ${Math.round(12 + Math.abs(rate - 0.5) * 60)}%, transparent);color:var(--ink)` : '',
          title: `对阵${LEVEL_FULL[k]}：${n ? `${r.w} 胜 ${r.l} 负 ${r.d} 和 · 点开看这些棋谱` : '还没下过'}`,
        };
      }),
    })),
    pvp,
  };
});

async function reset() {
  if (!(await ask({ title: '重置战绩？', text: '所有对手、难度下的胜负统计和连胜都会清零，双人对弈的战绩也一样。历史棋局会保留。此操作无法撤销。', ok: '重置', danger: true }))) return;
  resetRec(); updateUI(); toast('战绩已重置，历史棋局仍然保留');
}
</script>

<template>
  <section class="view v-records page" data-v="records" aria-label="战绩">
    <PageHeader title="战绩" sub="人机对弈按对手和难度分别统计，双人对弈单独记"><button v-if="v && (v.t || v.pvp)" type="button" class="btn ghost sm" id="btnResetRec" @click="reset">重置战绩</button></PageHeader>
    <template v-if="v">
      <EmptyState v-if="!v.t && !v.pvp" title="还没有对局" text="下完一盘，胜负、胜率、对手和难度的统计都会记在这里。"><button type="button" class="btn accent" @click="go('setup')">去下一盘</button></EmptyState>
      <template v-else>
        <h3 v-if="v.pvp" class="rc-gh">人机对弈</h3>
        <template v-if="v.t">
          <div class="rc-kpis" id="kpis" :title="v.hrs"><div v-for="[k, n] in v.kpis" :key="k" class="card stat"><b>{{ n }}</b><small>{{ k }}</small></div></div>
          <section class="card pad rc-sec">
            <div class="sec-h"><h3>近期胜负</h3><small>最近 {{ v.recent.length }} 盘{{ v.hrs ? ' · ' + v.hrs : '' }} · 点一盘打开复盘</small></div>
            <div class="recent" id="recent"><button v-for="x in v.recent" :key="x.t" type="button" :class="x.r" :title="x.title" :aria-label="x.title" :disabled="!x.has" @click="openHist(x.t)">{{ x.txt }}</button></div>
          </section>
          <section class="card pad rc-sec">
            <div class="sec-h"><h3>对手 × 难度</h3><small>胜-负，颜色越深越悬殊；红是赢得多，黑是输得多。点格子看那些棋谱</small></div>
            <table class="heat" id="heat"><tbody><tr><th class="o"></th><th v-for="d in v.diffs" :key="d">{{ d }}</th></tr>
              <tr v-for="o in v.heat" :key="o.id"><th class="o"><Avatar :id="o.id" :size="24"/>{{ o.name }}</th><td v-for="c in o.cells" :key="c.k" :class="{ cur: c.cur, go: c.n }" :style="c.style" :title="c.title"><button v-if="c.n" type="button" :aria-label="c.title" @click="openLv(c.k)">{{ c.txt }}</button><template v-else>{{ c.txt }}</template></td></tr></tbody></table>
          </section>
          <section v-if="v.rules.length" class="card pad rc-sec" id="rcRules">
            <div class="sec-h"><h3>各规则</h3><small>按棋规和开局规则分开统计（只算棋谱里还留着的对局）</small></div>
            <div class="rc-rules"><div v-for="r in v.rules" :key="r.name" class="rc-rule"><b>{{ r.name }}</b><span class="bar"><i :style="{ '--p': r.rate + '%', '--c': 'var(--seal)' }"></i></span><em>{{ r.rate }}%</em><small>{{ r.n }} 局 · {{ r.w }} 胜 {{ r.l }} 负{{ r.d ? ` ${r.d} 和` : '' }}</small></div></div>
          </section>
        </template>
        <div v-else class="card rc-none"><span>还没有人机对局。挑一位熟客下一盘，这里会按对手和难度记下胜负。</span><button type="button" class="btn sm" @click="go('setup')">去下一盘</button></div>
        <template v-if="v.pvp">
          <h3 class="rc-gh">双人对弈</h3>
          <div class="rc-kpis" id="pvpKpis"><div v-for="[k, n] in v.pvp.kpis" :key="k" class="card stat"><b>{{ n }}</b><small>{{ k }}</small></div></div>
          <section class="card pad rc-sec" id="pvpStats">
            <div class="sec-h"><h3>近期结果</h3><small>最近 {{ v.pvp.recent.length }} 盘{{ v.pvp.sub ? ' · ' + v.pvp.sub : '' }}</small></div>
            <div class="recent" id="pvpRecent"><button v-for="x in v.pvp.recent" :key="x.t" type="button" :class="x.r" :title="x.title" :aria-label="x.title" :disabled="!x.has" @click="openHist(x.t)">{{ x.txt }}</button></div>
          </section>
        </template>
      </template>
      <div class="rc-foot"><button type="button" class="btn ghost sm" @click="go('games')">查看历史棋局 ›</button></div>
    </template>
  </section>
</template>
