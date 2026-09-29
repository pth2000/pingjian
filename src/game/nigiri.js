/* ---- 双人对弈：猜先 ----
   一人从棋罐里抓一把白子握在手里，另一人猜单双；猜中的一方执黑先行（围棋的老规矩）。
   猜先期间棋盘不接受落子（play.js 的 humanPlay 会看 gv.nigiri）。卡片是 NigiriCard.vue */
import { gv } from '../stores/game-ui.js';
import { S } from '../ui/state.js';
import { opWanted, startOpening } from './opening-rule.js';

export function startNigiri() { gv.nigiri = { phase: 'ask' }; }
export function guessNigiri(odd) {
  const n = 5 + ((Math.random() * 17) | 0);        // 一把大概五到二十一颗
  gv.nigiri = { phase: 'reveal', n, odd: n % 2 === 1, guess: odd, hit: (n % 2 === 1) === odd };
}
export function endNigiri() { gv.nigiri = null; if (opWanted() && !S.op && !S.moves.length) startOpening(); }
