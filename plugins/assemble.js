/* 组装插件：
   - 把 styles/ 下的样式按 app.manifest.json 的顺序拼进 index.html 的 <style>。
   - 提供虚拟模块 'virtual:art'：构建时把 assets/art/*.webp 转成 data URI，
     导出 OPP_ART = { 对手id: { a: 头像, f: 立绘 }, player: { m, f } }。
   - 开发时（npm run dev）改样式或画像，浏览器整页刷新（脚本改动走 Vite 自己的热更新）。 */
import fs from 'node:fs';
import path from 'node:path';

const ART_IDS = ['wuming', 'chong', 'laogui', 'xieyue', 'yehu', 'atu'];
const ART_ID = 'virtual:art', ART_RESOLVED = '\0virtual:art';

export default function assemble() {
  let root = process.cwd();
  const read = p => fs.readFileSync(path.join(root, p), 'utf8');
  const has = p => fs.existsSync(path.join(root, p));
  const uri = p => 'data:image/webp;base64,' + fs.readFileSync(path.join(root, p)).toString('base64');

  function artModule() {
    const art = {};
    for (const id of ART_IDS) {
      const e = {};
      if (has(`assets/art/avatar_${id}.webp`)) e.a = uri(`assets/art/avatar_${id}.webp`);
      if (has(`assets/art/full_${id}.webp`)) e.f = uri(`assets/art/full_${id}.webp`);
      if (Object.keys(e).length) art[id] = e;
    }
    const pl = {};
    for (const g of ['m', 'f']) if (has(`assets/art/player_${g}.webp`)) pl[g] = uri(`assets/art/player_${g}.webp`);
    if (Object.keys(pl).length) art.player = pl;
    return '/* 对手画像：a 头像（方图，页面里裁成圆），f 立绘（2:3，透明底）。构建时由 assets/art 生成 */\n'
      + `export const OPP_ART = ${JSON.stringify(art)};\n`;
  }

  const styles = () => JSON.parse(read('app.manifest.json')).styles.map(f => read('styles/' + f)).join('');

  return {
    name: 'gomoku-assemble',
    configResolved(c) { root = c.root; },
    resolveId(id) { return id === ART_ID ? ART_RESOLVED : null; },
    load(id) { return id === ART_RESOLVED ? artModule() : null; },
    transformIndexHtml: {
      order: 'pre',
      // 用函数做替换，避免样式里的 $& 之类被当成替换模式
      handler: html => html.replace('<!--app:styles-->', () => styles()),
    },
    configureServer(server) {
      server.watcher.add(['styles', 'assets', 'app.manifest.json'].map(p => path.join(root, p)));
      server.watcher.on('all', (ev, f) => {
        const rel = path.relative(root, f).split(path.sep).join('/');
        if (rel.startsWith('assets/')) {
          const m = server.moduleGraph.getModuleById(ART_RESOLVED);
          if (m) server.moduleGraph.invalidateModule(m);
        }
        if (/^(styles|assets)\//.test(rel) || rel === 'app.manifest.json') server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
