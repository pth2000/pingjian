/* 界面状态（Pinia）：当前页面、弹框、提示条、剧情浮层、成就提示。
   这个模块不依赖任何业务模块，谁都可以放心 import。 */
import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { pinia } from './pinia.js';

const NARROW_MQ = '(max-width: 820px), (max-height: 560px)';
const useUi = defineStore('ui', () => ({
  view: ref('home'),        // 当前页面（ui/views.js 的 showView 设置，路由跟着走）
  booted: ref(false),       // 各模块初始化完成后才渲染依赖数据的内容
  narrow: useMediaQuery(NARROW_MQ),   // 手机布局（跟着窗口变）
  modal: reactive({ open: false, title: '', text: '', html: '', ok: '确定', cancel: '取消', danger: false, seq: 0 }),
  toast: reactive({ on: false, msg: '' }),
  layer: reactive({ kind: '', cls: '', data: null, seq: 0 }),   // 剧情浮层：bond 最后一步 / tale 故事 / create 建角色 / dbg 调试面板
  ach: reactive({ a: null, show: false }),                     // 成就达成时从顶上滑下来的小卡
  achFresh: ref(new Set()),  // 成就页：打开那一刻哪些是「新」的（打开后数据里的标记就清掉了，这里留一份给页面显示）
  setupSel: reactive({ mode: 'ai', opp: 'rand', diff: 'normal', side: '1', ruleSet: 'renju', first: 'me', nigiri: true }),   // 人机对弈设置页的选择
  gamesLv: ref(''),          // 棋谱页只看某个对手 × 难度（从战绩页的格子点进来）；离开棋谱页就清掉
}));
export const ui = useUi(pinia);
export const setupSel = ui.setupSel;
