/* 导航：侧栏（电脑）、顶栏和底部页签（手机）共用这一份 */
import { markRaw } from 'vue';
import { Award, BookOpen, ChartNoAxesColumn, CircleHelp, Crosshair, Grid3x3, House, NotebookPen, ScrollText, UserRound } from 'lucide-vue-next';

const I = c => markRaw(c);
// 四个主页签
export const NAV_MAIN = [
  { v: 'home', label: '主页', icon: I(House), id: 'tabHome' },
  { v: 'game', label: '对弈', icon: I(Grid3x3), id: 'tabGame', also: ['setup'] },
  { v: 'dingshi', label: '定式', icon: I(BookOpen), id: 'btnBook' },
  { v: 'shafa', label: '杀法', icon: I(Crosshair), id: 'tabPz' },
];
// 棋馆里的其他去处（手机上收在「我的」里）
export const NAV_MORE = [
  { v: 'notes', label: '札记', icon: I(NotebookPen), story: true },
  { v: 'records', label: '战绩', icon: I(ChartNoAxesColumn) },
  { v: 'games', label: '棋谱', icon: I(ScrollText) },
  { v: 'ach', label: '成就', icon: I(Award) },
];
export const NAV_RULES = { v: 'rules', label: '规则', icon: I(CircleHelp) };
export const NAV_ME = { v: 'profile', label: '我的', icon: I(UserRound), also: ['notes', 'records', 'games', 'ach', 'rules'] };
// 页面标题（顶栏、浏览器标签）
export const VIEW_TITLE = { home: '枰间', game: '对弈', setup: '人机对弈', dingshi: '定式', shafa: '杀法练习', records: '战绩', games: '棋谱', rules: '规则与说明', ach: '成就', notes: '札记', profile: '我的' };
// 手机顶栏左上角：这几页是页签本身，显示店招；其余显示返回
export const TOP_LEVEL = ['home', 'game', 'dingshi', 'shafa', 'profile'];
export const isOn = (item, view) => item.v === view || (item.also || []).includes(view);
