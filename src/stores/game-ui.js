/* 对弈页的界面状态（Pinia；棋局数据本身在 ui/state.js 的 S 里，也是响应式的）。 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pinia } from './pinia.js';

const useGameUi = defineStore('gameUi', () => ({
  clock: ref(0),            // 每秒走一下，给「本局用时」
  tab: ref('set'),          // 面板页签：set 设置 / data 数据 / log 棋谱
  sheet: ref(false),        // 手机：底部面板打开
  drawer: ref(false),       // 电脑：设置抽屉打开
  room: ref(0),             // 电脑：棋盘上下还有多少空（0 没有；1 放得下对局卡；2 棋盘下面还能放陪练）         // 三栏布局（本局表现、棋风读数放到左栏 / 走势图下面）
  perfOpen: ref(true),      // 「本局表现」展开
  tapnote: ref(false),      // 手机：点过棋盘后出现的操作说明
  wrHover: ref(-1),         // 走势图上鼠标指着第几手
  result: ref(null),        // 结算卡的内容
  resultOn: ref(false),     // 结算卡显示着
  resultSeq: ref(0),        // 每次弹出结算卡加一：印章动画重放
  intro: ref(null),         // 开局卡的内容
  introOn: ref(false),
  introSeq: ref(0),
  nigiri: ref(null),        // 双人对弈开局前的猜先：{ phase: 'ask' } 或 { phase: 'reveal', n, odd, hit }
  sayAnim: ref(0),          // 陪练说新话：气泡淡入重放
  sayMore: ref(false),      // 手机：陪练的话超过三行，显示「展开」
  sayOpen: ref(false),      // 手机：展开看全文
  sayMinH: ref(''),
  facePop: ref(0),          // 陪练表情变化：头像弹一下
}));
export const gv = useGameUi(pinia);
