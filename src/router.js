/* 路由（hash 模式：打成单个 html、离线双击打开也能用）。
   对弈、定式、杀法三页有画布和一直在跑的状态，常驻在 App.vue 里，路由只负责地址和前进后退（组件是空的）；
   其余各页由 <RouterView> 挂上，进页面才渲染。
   页面切换的实际动作仍在 ui/views.js 的 showView()：它同步改好界面，再让路由跟上；
   反过来，前进 / 后退 / 直接打开某个地址时，路由通知 views.js 进那一页（见 views.js 的 __init）。
   札记的人物页是 /notes/某人（NT.sel 跟着地址走），后退就回到札记总览。 */
import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import SetupView from './views/SetupView.vue';
import RecordsView from './views/RecordsView.vue';
import GamesView from './views/GamesView.vue';
import NotesView from './views/NotesView.vue';
import ProfileView from './views/ProfileView.vue';
import AchView from './views/AchView.vue';
import RulesView from './views/RulesView.vue';

const Board = { render: () => null };      // 常驻页：路由上占个位
const PAGES = { home: HomeView, setup: SetupView, records: RecordsView, games: GamesView, notes: NotesView, profile: ProfileView, ach: AchView, rules: RulesView };
const BOARD_PAGES = ['game', 'dingshi', 'shafa'];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    ...Object.entries(PAGES).filter(([k]) => k !== 'home').map(([name, component]) => ({ path: '/' + name + (name === 'notes' ? '/:id?' : ''), name, component })),
    ...BOARD_PAGES.map(name => ({ path: '/' + name, name, component: Board })),
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
