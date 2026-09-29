/* 入口：先挂上 Vue 页面（整页结构同步渲染出来），再让各模块读存档、接事件，最后让依赖数据的内容渲染出来。
   启动顺序：角色最先（它接管本地存储，按角色分开存），然后是棋局数据、界面、各功能，最后开局 / 读回没下完的棋。 */
import './expose.js';
import { createApp } from 'vue';
import App from './App.vue';
import { pinia } from './stores/pinia.js';
import { router } from './router.js';
import { bindRouter } from './ui/views.js';
import './ui/theme.js';                // 外观（浅色 / 深色）：启动时就套上
import { ui } from './stores/ui.js';
import { __init as initProfile } from './core/profile.js';
import { __init as initState } from './ui/state.js';
import { __init as initSound } from './ui/sound.js';
import { __init as initCanvas } from './ui/canvas.js';
import { __init as initWorker } from './ui/worker-client.js';
import { __init as initTree } from './openings/tree.js';
import { __init as initBook } from './openings/book-layout.js';
import { __init as initPuzzles } from './puzzles/puzzles.js';
import { __init as initPractice } from './openings/practice.js';
import { __init as initCoach } from './game/coach.js';
import { __init as initPanel } from './ui/panel.js';
import { __init as initInput } from './ui/input.js';
import { __init as initSettings } from './ui/settings.js';
import { __init as initStory } from './story/story.js';
import { __init as initAch } from './features/achievements.js';
import { __init as initViews } from './ui/views.js';
import { __init as initHideForb } from './features/hide-forbidden.js';
import { __init as initDebug } from './features/debug.js';
import { __init as start } from './main.js';

bindRouter(router);
createApp(App).use(pinia).use(router).mount('#app');

initProfile();                // 角色：接管本地存储
initState();                  // 战绩、棋谱、偏好
initSound();                  // 音效预热
initCanvas();                 // 棋盘画布
initWorker();                 // 后台线程
initTree();                   // 定式树的局面索引（稍后在空闲时建）
initBook();                   // 定式页：尺寸、键盘
initPuzzles();                // 杀法：记录、键盘
initPractice();               // 定式练习：键盘
initCoach();                  // 陪练气泡
initPanel();                  // 每秒走表、陪练闲聊
initInput();                  // 对弈页：键盘、窗口大小
initSettings();               // 对局设置、左栏自适应
initStory();                  // 剧情：交情、札记、各人的故事（接到对局上）
initAch();                    // 成就（接到对局上）
initViews();                  // 页面切换、返回键
initHideForb();               // 隐藏禁手点（接到对局上）
initDebug();                  // 调试面板（彩蛋）
start();                      // 读回没下完的棋，停在主页

ui.booted = true;
