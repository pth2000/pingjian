/* 定式页、杀法页的界面状态（Pinia；数据本身在 BK、PZ 里，也是响应式的） */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pinia } from './pinia.js';

const useBoardsUi = defineStore('boardsUi', () => ({
  menu: ref(false),     // 定式页「更多」菜单打开
  stamp: ref(null),     // 刚解开时盖的「杀」字印章 { perfect, key }
  roomy: ref(false),    // 电脑：棋盘上面还有空，开局名 / 题目标题挪到棋盘上面
}));
export const bt = useBoardsUi(pinia);
