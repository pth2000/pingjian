/* 外观：跟随系统 / 浅色 / 深色。记在这台设备上；html 的 data-theme 由 VueUse 的 useColorMode 管，
   样式里的颜色变量按它切换（styles/base.css、system.css）。换了以后棋盘重画一遍 */
import { watch } from 'vue';
import { useColorMode } from '@vueuse/core';
import { render } from './canvas.js';

const mode = useColorMode({ attribute: 'data-theme', selector: 'html', storageKey: 'gomoku_theme', initialValue: 'auto' });
// 设置里选的是 store（auto / light / dark）；mode 本身是解析后的浅色 / 深色，拿它当选项值就选不中「跟随系统」
export const colorPref = mode.store;
watch(mode, () => { try { render(); } catch (e) {} }, { flush: 'post' });
