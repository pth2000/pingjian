import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import assemble from './plugins/assemble.js';

export default defineConfig({
  // assemble：把 styles/、src/ 下的老代码按清单拼进页面（普通脚本）；
  // vue：src/vue/ 下的页面组件；singlefile：把打包出来的 Vue 部分也内嵌进 index.html，离线双击就能开
  plugins: [assemble(), vue(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: false,
  },
  server: { port: 5173, open: false },
});
