/* ---- 规则：分三组的预设 ----
   每种预设 = 棋规（引擎的 RULE：free 无禁手 / std 标准五子棋 / renju 连珠）+ 开局规则（S.openRule）。
   设置里只选预设，不分开选棋规和开局规则，避免出现正式比赛里不存在的组合。
     日常：不设开局规则
     世界五子棋：标准五子棋 + 五子棋比赛用过的开局规则（Swap2 现行）
     世界连珠：连珠 + RIF 认可的开局规则（索索夫-8 现行）
   开局规则的实现：Swap、Swap2、RIF、山口、索索夫-8、塔拉古奇-10 走 game/opening-rule.js 的开局阶段（S.op）；
   Pro、Long Pro 只限制黑方第 2 子的位置，由引擎的 AWAY 和 humanPlay 管，黑白照执子设置。
   状态仍然记在 S.rule、S.openRule 两处（引擎、存档、棋谱都按 S.rule），这里负责两者始终成对。 */
import { S } from '../ui/state.js';

export const RULE_GROUPS = [
  { id: 'daily', name: '日常', note: '不设开局规则' },
  { id: 'gomoku', name: '世界五子棋', note: '标准五子棋：恰好五子胜，无禁手' },
  { id: 'renju', name: '世界连珠', note: 'RIF 连珠规则：黑方有禁手' },
];
export const RULESETS = [
  { id: 'free', group: 'daily', name: '无禁手', short: '无禁手', brief: '五子及以上即胜', rule: 'free', open: 'free',
    desc: '双方均无禁手，连成五子或五子以上即胜。黑方先行，不设开局规则。' },
  { id: 'std', group: 'daily', name: '标准五子棋', short: '标准五子棋', brief: '恰好五子胜', rule: 'std', open: 'free',
    desc: '双方均无禁手，须恰好连成五子方为胜，长连不计胜。黑方先行，不设开局规则。' },
  { id: 'renju', group: 'daily', name: '连珠', short: '连珠', brief: '黑方有禁手', rule: 'renju', open: 'free',
    desc: '黑方有三三、四四、长连禁手，须恰好连成五子方为胜；白方无禁手，长连亦胜。黑方先行，不设开局规则。' },

  { id: 'gwc', group: 'gomoku', name: 'Swap2', short: '五子棋 · Swap2', brief: '世锦赛现行（2009 年起）', rule: 'std', open: 'swap2',
    desc: '标准五子棋，开局采用 Swap2。五子棋世界锦标赛自 2009 年起采用。' },
  { id: 'swap1', group: 'gomoku', name: 'Swap', short: '五子棋 · Swap', brief: '摆三子后选择执子', rule: 'std', open: 'swap1',
    desc: '标准五子棋，开局采用 Swap：假先方摆放前三手，假后方选择执黑或执白。' },
  { id: 'pro', group: 'gomoku', name: 'Pro', short: '五子棋 · Pro', brief: '第 3 手离天元 3 路以上', rule: 'std', open: 'pro',
    desc: '标准五子棋，开局采用 Pro：黑方第 1 手下在天元，第 3 手须与天元相距至少 3 路（在中心 5×5 之外）。1989、1991 年五子棋世锦赛采用。' },
  { id: 'lpro', group: 'gomoku', name: 'Long Pro', short: '五子棋 · Long Pro', brief: '第 3 手离天元 4 路以上', rule: 'std', open: 'lpro',
    desc: '标准五子棋，开局采用 Long Pro：黑方第 1 手下在天元，第 3 手须与天元相距至少 4 路（在中心 7×7 之外）。' },

  { id: 'rwc', group: 'renju', name: '索索夫-8', short: '连珠 · 索索夫-8', brief: '世锦赛现行（2017 年起）', rule: 'renju', open: 'ss8',
    desc: '连珠规则，开局采用索索夫-8。RIF 连珠世界锦标赛自 2017 年起采用。' },
  { id: 'yama', group: 'renju', name: '山口规则', short: '连珠 · 山口规则', brief: '世锦赛 2009–2015 年', rule: 'renju', open: 'yama',
    desc: '连珠规则，开局采用山口规则（Yamaguchi）。RIF 连珠世界锦标赛 2009–2015 年采用。' },
  { id: 'rif', group: 'renju', name: 'RIF 规则', short: '连珠 · RIF 规则', brief: '世锦赛 1996–2008 年', rule: 'renju', open: 'rif',
    desc: '连珠规则，开局采用 RIF 规则（五手二打）。RIF 连珠世界锦标赛 1996–2008 年采用。' },
  { id: 'tara', group: 'renju', name: '塔拉古奇-10', short: '连珠 · 塔拉古奇-10', brief: '通讯赛、欧锦赛', rule: 'renju', open: 'tara',
    desc: '连珠规则，开局采用塔拉古奇-10（Taraguchi-10）。RIF 于 2011 年认可，用于 2012 年连珠通讯世锦赛和 2010 年起的欧洲锦标赛。' },
];
const BY_ID = Object.fromEntries(RULESETS.map(r => [r.id, r]));
const rulesetOf = (rule, open) => RULESETS.find(r => r.rule === rule && r.open === open) || null;
export const rulesetNow = () => rulesetOf(S.rule, S.openRule) || BY_ID.renju;
export const rulesetById = id => BY_ID[id] || BY_ID.renju;
// 开局阶段要双方摆子、交换的开局规则（其余的黑白照执子设置）
export const SWAP_OPENS = new Set(['swap1', 'swap2', 'rif', 'yama', 'ss8', 'tara']);
// Pro / Long Pro：黑方第 2 子（第 3 手）与天元的最小距离
export const awayOf = open => (open === 'pro' ? 3 : open === 'lpro' ? 4 : 0);
// 历史棋局里只记了棋规和开局规则：给出对应的预设名称
export const rulesetLabel = (rule, open) => (rulesetOf(rule, open || 'free') || rulesetOf(rule, 'free') || BY_ID.renju).short;
export function applyRuleset(id) { const r = rulesetById(id); S.rule = r.rule; S.openRule = r.open; S.prefRS = null; }
// 载入棋谱、历史棋局换了棋规：先记下原来的设置，开新局时换回来
export function keepRulePref() { if (!S.prefRS) S.prefRS = { rule: S.rule, open: S.openRule }; }

// 棋规和开局规则不成对时（旧存档、载入别人的棋谱）改成最接近的预设。
//   by 'open'（读设置、开新局时）：按开局规则定棋规
//   by 'rule'（载入棋谱时）：按棋规定，开局规则对不上就不设
export function fitRuleset(by = 'open') {
  if (rulesetOf(S.rule, S.openRule)) return;
  const want = RULESETS.find(r => r.open === S.openRule && r.open !== 'free');
  if (by === 'open' && want) S.rule = want.rule;
  else S.openRule = 'free';
  if (!rulesetOf(S.rule, S.openRule)) { S.rule = 'renju'; S.openRule = 'free'; }
}
