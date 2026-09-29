/* Pinia 实例：模块加载时就建好并设为当前实例，普通 JS 模块（不只是组件）也能直接用 store。
   app.js 里 app.use(pinia)，开发者工具里就能看到各个 store。 */
import { createPinia, setActivePinia } from 'pinia';

export const pinia = createPinia();
setActivePinia(pinia);
