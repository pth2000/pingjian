/* 打离线包：dist/ 里的页面（引擎和后台线程都在里面）+ 两个外部脚本 + 说明，放进 release/pingjian/，再压成 release/pingjian.zip。
   先 vite build（npm run release 会自动先构建）。压缩用系统自带的 zip（Windows 用 PowerShell）。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const dist = path.join(root, 'dist'), rel = path.join(root, 'release'), dir = path.join(rel, 'pingjian');
fs.rmSync(rel, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (const f of ['index.html', 'coaches.js', 'avatars.js']) fs.copyFileSync(path.join(dist, f), path.join(dir, f));
fs.copyFileSync(path.join(root, 'scripts', 'README.txt'), path.join(dir, 'README.txt'));
const ps = process.platform === 'win32'
  ? ['pwsh', 'powershell'].find(cmd => spawnSync(cmd, ['-NoLogo', '-NoProfile', '-Command', '$null'], { stdio: 'ignore' }).status === 0)
  : null;
const zip = process.platform === 'win32' && ps
  ? spawnSync(ps, ['-NoLogo', '-NoProfile', '-Command', `Compress-Archive -Path '${dir}' -DestinationPath '${path.join(rel, 'pingjian.zip')}' -Force`], { stdio: 'inherit' })
  : process.platform === 'win32'
    ? { status: 1 }
    : spawnSync('zip', ['-qr', 'pingjian.zip', 'pingjian'], { cwd: rel, stdio: 'inherit' });
if (zip.status !== 0) { console.error('压缩失败：release/pingjian/ 里的文件已经准备好，可以手动压缩'); process.exit(1); }
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`release/pingjian.zip  ${kb(fs.statSync(path.join(rel, 'pingjian.zip')).size)}`);
