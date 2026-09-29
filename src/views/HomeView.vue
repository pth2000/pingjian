<script setup>
/* 主页：以下棋为主。最上面是「继续对局 / 再来一盘」，旁边是今天该解的一道杀法；
   下面一排是定式、战绩、成就；剧情开着时，最后是棋馆里的六位熟客。 */
import { computed } from 'vue';
import { ui } from '../stores/ui.js';
import MiniBoard from '../components/MiniBoard.vue';
import Avatar from '../components/Avatar.vue';
import { go, oppRec, quickStart } from '../ui/views.js';
import { inProgress } from '../ui/settings.js';
import { PVP, myTurn, toMove } from '../ui/sound.js';
import { DIFF_NAME, HIST, LEVELS, OPP, OPP_COL, REC, S, STATS, diffOf, oppOf } from '../ui/state.js';
import { OP_EV, openingOf, OPENINGS, opMoves } from '../openings/openings.js';
import { opLabel, opTag } from '../openings/tree.js';
import { PUZZLES } from '../data/puzzles.js';
import { PZREC, PZ_LV, cName, openPuzzles, pzLevel } from '../puzzles/puzzles.js';
import { BK } from '../openings/book-page.js';
import { OPPONENTS } from '../engine/engine.js';
import { oppKnown } from '../story/portraits.js';
import { ACH, ACHS } from '../features/achievements.js';
import { PROFILE } from '../core/profile.js';
import { ST, playerName, stageName } from '../story/story.js';
import { ArrowRight, BookOpen, Crosshair, Users } from 'lucide-vue-next';
import { rulesetNow } from '../game/rulesets.js';
import { SWAP_OPENS } from '../game/rulesets.js';

const m = computed(() => {
  if (!ui.booted) return null;
  ui.view;                                   // 每次回到主页重新问好（时间段可能变了）
  const h = new Date().getHours(), hi = h < 5 ? '夜深了' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  const name = PROFILE.cur ? playerName() : '';

  // 对局：有没下完的就继续，否则「再来一盘」（上次的对手和难度）
  let play;
  if (inProgress()) {
    const pvp = PVP(), o = openingOf(S.moves), id = oppOf(S.level);
    const turn = S.over ? '' : pvp ? `轮到${toMove() === 1 ? '黑' : '白'}棋` : myTurn() ? '轮到你落子' : '对手在想';
    play = { cont: true, pvp, id: pvp ? '' : id, moves: S.moves.slice(),
      title: pvp ? '双人对弈' : `对阵${OPP[id].name}`, diff: pvp ? '' : DIFF_NAME[diffOf(S.level)],
      meta: [`第 ${S.moves.length} 手`, o ? opLabel(o) : '', S.practice ? '开局练习' : '', turn].filter(Boolean) };
  } else {
    const id = oppOf(S.level), rand = !!S.randOpp, r = oppRec(id), played = HIST.some(x => x.lv && x.lv !== 'pvp');
    const last = HIST.length ? HIST[HIST.length - 1] : null;      // 右边的小棋盘：上一盘的终局；还没下过就摆一局花月
    play = { cont: false, rand, id: rand ? 'rand' : id, moves: last && Array.isArray(last.m) && last.m.length ? last.m.slice() : [112, 113, 127, 111, 96, 128, 98, 126, 142],
      title: played ? '再来一盘' : '开一局', name: rand ? '随机对手' : OPP[id].name, tag: rand ? '每局换人' : OPP[id].tag,
      diff: DIFF_NAME[diffOf(S.level)], side: SWAP_OPENS.has(S.openRule) ? (S.opFirst === 'opp' ? '对手先摆' : '我先摆') : (S.side || S.human) === 1 ? '执黑先行' : '执白后行', rule: rulesetNow().short,
      rec: !rand && r.w + r.l ? `${r.w} 胜 ${r.l} 负` : '' };
  }

  // 杀法：第一道还没解开的题
  const solved = PUZZLES.filter(p => PZREC[p.id] && PZREC[p.id].g !== 'seen').length;
  let k = PUZZLES.findIndex(p => !PZREC[p.id] || PZREC[p.id].g === 'seen'); if (k < 0) k = 0;
  const pz = PUZZLES[k];
  const puzzle = { k, moves: pz.ms, no: k + 1, lv: PZ_LV[pzLevel(pz)][0], side: cName(pz.a), len: (pz.len + 3) / 2,
    solved, all: PUZZLES.length, p: (solved / PUZZLES.length * 100).toFixed(1) + '%', done: solved === PUZZLES.length };

  // 定式：上次翻到的开局
  const op = BK.op || OPENINGS.find(x => x.id === '4D');
  // 26 种开局按直指、斜指排两行小点：看过的描一圈，练通的（定式练习按谱走完、没出谱）填满，当前这局下面一道短线
  const drill = ACH.drill || [];
  const dots = k => OPENINGS.filter(o => o.k === k).map(o => ({ id: o.id, name: o.name, st: drill.includes(o.id) ? 'done' : ACH.ops.includes(o.id) ? 'seen' : '', cur: o.id === op.id }));
  const book = { name: op.name, tag: opTag(op), ev: OP_EV[op.ev][0], evc: OP_EV[op.ev][1][0], moves: BK.op && BK.line.length ? BK.line.slice() : opMoves(op), at: BK.op ? BK.line.length : 3,
    seen: ACH.ops.length, done: drill.length, all: OPENINGS.length, fresh: !BK.op, rows: [['直指', dots('D')], ['斜指', dots('I')]] };

  // 战绩：生涯合计 + 最近几盘
  let w = 0, l = 0, d = 0, best = 0;
  for (const lv of LEVELS) { const r = REC[lv]; if (r) { w += r.w; l += r.l; d += r.d; best = Math.max(best, r.best || 0); } }
  const t = w + l + d;
  const ai = HIST.filter(x => x.lv !== 'pvp' && !x.adv && !x.story && x.t >= STATS.from);
  const recent = ai.slice(-10).map(x => x.r);
  // 执黑、执白分开的胜率（按记着的对局算）
  const bySide = [[1, '执黑'], [2, '执白']].map(([h, k]) => { const g = ai.filter(x => x.h === h), n = g.length, wn = g.filter(x => x.r === 'w').length;
    return { k, n, p: n ? Math.round(wn / n * 100) : 0, txt: n ? `${Math.round(wn / n * 100)}%` : '–' }; });
  const rec = { t, rate: t ? Math.round(w / t * 100) + '%' : '–', best, recent, pad: Math.max(0, 10 - recent.length), bySide,
    games: HIST.filter(x => Array.isArray(x.m) && x.m.length).length, pvp: REC.pvp.b + REC.pvp.w + REC.pvp.d };

  // 成就
  const got = ACHS.filter(a => ACH.got[a.id]).sort((a, b) => ACH.got[b.id] - ACH.got[a.id]);
  // 印章墙：得到的按品级上色，没得到的描虚线，隐藏成就没得到时只画问号；下一个目标取第一个没得到、不隐藏的
  const seals = ACHS.map(a => ({ id: a.id, g: ACH.got[a.id] || !a.hidden ? a.g : '？', t: a.t, got: !!ACH.got[a.id], tip: ACH.got[a.id] || !a.hidden ? a.name : '隐藏成就' }));
  const next = ACHS.find(a => !ACH.got[a.id] && !a.hidden);
  const tiers = [1, 2, 3].map(t => got.filter(a => a.t === t).length);
  const ach = { n: got.length, all: ACHS.length, p: (got.length / ACHS.length * 100).toFixed(1) + '%', last: got[0] || null, fresh: ACH.fresh.length, seals, tiers,
    next: next ? `${next.name}：${next.desc.replace(/。$/, '')}` : '' };

  // 熟客（剧情开着时）
  const cast = ST.on ? OPPONENTS.map(o => ({ id: o.id, name: o.name, col: OPP_COL[o.id], known: oppKnown(o.id), stage: oppKnown(o.id) ? stageName(o.id) : (ST.cnt[o.id] ? '初见' : '未见过'), heart: (ST.stage[o.id] || 0) >= 5 })) : null;

  return {
    hello: name ? `${name}，${hi}。` : `${hi}。`,
    sub: ST.on ? '半闲棋馆的门开着，熟客们在等你。' : '十五路棋盘，五子棋与连珠。',
    play, puzzle, book, rec, ach, cast, notesNew: ST.on && ST.freshW > 0,
  };
});
const RT = { w: '胜', l: '负', d: '和' };
</script>

<template>
  <section class="view v-home" data-v="home" id="vHome" aria-label="主页">
    <template v-if="m">
      <header class="hm-head">
        <h2 id="hmHello">{{ m.hello }}</h2>
        <p>{{ m.sub }}</p>
      </header>

      <div class="hm-grid">
        <!-- 对局 -->
        <article class="card hm-play" :class="{ cont: m.play.cont }">
          <div class="hm-play-t">
            <p class="eyebrow">{{ m.play.cont ? '上次的对局还没下完' : '人机对弈' }}</p>
            <h3>{{ m.play.cont ? '继续对局' : m.play.title }}</h3>
            <div v-if="m.play.cont" class="hm-opp">
              <Avatar v-if="m.play.id" :id="m.play.id" :size="52"/><span v-else class="hm-pvp" aria-hidden="true"><i class="b"></i><i class="w"></i></span>
              <div><b>{{ m.play.title }}</b><small>{{ [m.play.diff, ...m.play.meta].filter(Boolean).join(' · ') }}</small></div>
            </div>
            <div v-else class="hm-opp">
              <Avatar :id="m.play.id" :size="52"/>
              <div><b>{{ m.play.name }}<span class="chip">{{ m.play.diff }}</span></b><small>{{ [m.play.tag, m.play.side, m.play.rule, m.play.rec].filter(Boolean).join(' · ') }}</small></div>
            </div>
            <div class="hm-acts">
              <button v-if="m.play.cont" type="button" id="homeCont" class="btn accent lg" @click="go('game')">继续<ArrowRight aria-hidden="true"/></button>
              <button v-else type="button" id="homeQuick" class="btn accent lg" @click="quickStart()">开始对局<ArrowRight aria-hidden="true"/></button>
              <button type="button" class="btn" @click="go('setup')">{{ m.play.cont ? '开新局' : '换个对手' }}</button>
              <button type="button" class="btn ghost" @click="go('pvp')"><Users aria-hidden="true"/>双人对弈</button>
            </div>
          </div>
          <div class="hm-board"><MiniBoard :moves="m.play.moves"/></div>
        </article>

        <!-- 今天的一道杀法 -->
        <button type="button" class="card hm-pz" @click="openPuzzles(m.puzzle.k)">
          <p class="eyebrow"><Crosshair class="ic" aria-hidden="true"/>杀法练习<span class="hm-tag">连珠</span></p>
          <div class="hm-pz-b"><MiniBoard :moves="m.puzzle.moves"/></div>
          <h3>{{ m.puzzle.done ? '全部解开了' : m.puzzle.solved ? `接着做第 ${m.puzzle.no} 题` : `从第 ${m.puzzle.no} 题开始` }}<small>{{ m.puzzle.lv }} · {{ m.puzzle.side }}先 · 最短 {{ m.puzzle.len }} 手杀</small></h3>
          <div class="hm-prog"><span class="bar"><i :style="{ '--p': m.puzzle.p, '--c': 'var(--seal)' }"></i></span><small id="hcPzMeta">已解 {{ m.puzzle.solved }} / {{ m.puzzle.all }}</small></div>
        </button>

        <!-- 定式 -->
        <button type="button" class="card hm-ds" @click="go('dingshi')">
          <p class="eyebrow"><BookOpen class="ic" aria-hidden="true"/>定式<span class="hm-tag">连珠</span></p>
          <div class="hm-row"><div class="hm-mini"><MiniBoard :moves="m.book.moves"/></div>
            <div class="hm-bk"><h3 class="brush">{{ m.book.name }}</h3><small>{{ m.book.tag }}<i class="hm-ev" :class="m.book.evc">{{ m.book.ev }}</i></small>
              <small>{{ m.book.fresh ? '26 种标准开局，从这一局看起' : `上次看到第 ${m.book.at} 手` }}</small></div></div>
          <div class="hm-ops" aria-hidden="true"><template v-for="[k, row] in m.book.rows" :key="k"><span class="hm-opk">{{ k }}</span><span class="hm-opd"><i v-for="d in row" :key="d.id" :class="[d.st, { cur: d.cur }]" :title="d.name"></i></span></template></div>
          <div class="hm-prog hm-oplg"><small><i class="seen"></i>看过 {{ m.book.seen }}</small><small><i class="done"></i>练通 {{ m.book.done }}</small><small>共 {{ m.book.all }} 种</small></div>
        </button>

        <!-- 战绩 -->
        <button type="button" class="card hm-rec" @click="go('records')">
          <p class="eyebrow">战绩</p>
          <div class="hm-stats"><span class="stat"><b>{{ m.rec.t }}</b><small>人机对局</small></span><span class="stat"><b>{{ m.rec.rate }}</b><small>胜率</small></span><span class="stat"><b>{{ m.rec.best }}</b><small>最长连胜</small></span></div>
          <div class="hm-sub"><small>最近 10 局</small><div class="hm-recent"><i v-for="(r, i) in m.rec.recent" :key="i" :class="r" :title="RT[r]">{{ RT[r] }}</i><i v-for="i in m.rec.pad" :key="'p' + i" class="pad"></i></div></div>
          <div class="hm-sides"><div v-for="x in m.rec.bySide" :key="x.k" class="hm-side"><small>{{ x.k }}</small><span class="bar"><i :style="{ '--p': x.p + '%', '--c': 'var(--seal)' }"></i></span><b>{{ x.txt }}</b><small class="n">{{ x.n }} 局</small></div></div>
          <small id="hmRec" class="hm-foot">{{ [m.rec.pvp ? `双人对弈 ${m.rec.pvp} 局` : '', m.rec.games ? `${m.rec.games} 局棋谱可以复盘` : '下完的对局会记在这里，可以复盘'].filter(Boolean).join(' · ') }}</small>
        </button>

        <!-- 成就 -->
        <button type="button" class="card hm-ach" @click="go('ach')">
          <p class="eyebrow">成就<i v-if="m.ach.fresh" class="dotnew" aria-label="有新成就"></i></p>
          <div class="hm-ach-n"><b class="num">{{ m.ach.n }}</b><small>/ {{ m.ach.all }}</small>
            <span class="hm-tiers"><small v-for="(n, i) in m.ach.tiers" :key="i" :class="'t' + (i + 1)"><i></i>{{ ['铜', '银', '金'][i] }} {{ n }}</small></span></div>
          <div class="hm-seals" aria-hidden="true"><span v-for="a in m.ach.seals" :key="a.id" class="ach-seal sm" :class="['t' + a.t, { got: a.got }]" :title="a.tip">{{ a.g }}</span></div>
          <small id="hmAch" class="hm-foot">{{ m.ach.next ? `下一个：${m.ach.next}` : '成就已全部达成' }}</small>
        </button>

        <!-- 熟客 -->
        <section v-if="m.cast" class="card hm-cast" aria-label="熟客">
          <div class="sec-h"><h3>棋馆里的熟客<i v-if="m.notesNew" class="dotnew" aria-label="札记有新内容"></i></h3><a href="#/notes" @click.prevent="go('notes')">札记 ›</a></div>
          <div class="hm-cast-l">
            <button v-for="c in m.cast" :key="c.id" type="button" class="hm-c" :class="{ unk: !c.known, heart: c.heart }" :style="{ '--oc': c.col }" :data-nt="c.known ? c.id : null" @click="!c.known && go('notes')">
              <Avatar :id="c.id" :size="48"/><b>{{ c.name }}</b><small>{{ c.stage }}</small></button>
          </div>
        </section>
      </div>
    </template>
  </section>
</template>
