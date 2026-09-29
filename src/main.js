import { layout } from './ui/canvas.js';
import { syncBars } from './ui/panel.js';
import { restoreSaved } from './game/save.js';
import { newGame } from './game/new-game.js';
import { showView } from './ui/views.js';
import { refreshWood } from './ui/canvas.js';

/* ---- 启动的最后一步：量好棋盘，读回没下完的棋（没有就开一局），停在主页 ---- */
export function __init() {
  layout();
  syncBars();
  if (!restoreSaved()) newGame();
  showView('home', true);                        // 地址里要是别的页（刷新、书签），路由稍后会带过去
  if (document.fonts) document.fonts.ready.then(refreshWood);   // 字体到了再画一遍（坐标用的等宽字体）
}
