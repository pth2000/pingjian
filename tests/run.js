/* 回归测试：先构建，再用 vite preview 起一个本地服务，逐个跑 tests/*.cjs（Playwright 脚本）。
   用法：npm test                 全部跑
        npm test -- story notes  只跑文件名里带这些词的
        npm test -- --no-build   跳过构建，直接测 dist/
   截图等输出在 tests/out/。 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const filters = args.filter(a => !a.startsWith('--'));
const PORT = 4173, BASE = `http://localhost:${PORT}/`;

if (!noBuild) {
  const r = spawnSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status || 1);
}
const out = path.join(here, 'out'); fs.mkdirSync(out, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' });
const stop = () => { try { srv.kill(); } catch (e) {} };
process.on('exit', stop);

async function waitUp() {
  for (let k = 0; k < 60; k++) { try { const r = await fetch(BASE); if (r.ok) return; } catch (e) {} await new Promise(r => setTimeout(r, 250)); }
  throw new Error('本地服务没起来');
}
const run = f => new Promise(res => {
  const t0 = Date.now();
  const p = spawn(process.execPath, [path.join(here, f)], { cwd: out, env: { ...process.env, BASE_URL: BASE } });
  let log = ''; p.stdout.on('data', d => (log += d)); p.stderr.on('data', d => (log += d));
  p.on('close', code => res({ f, code, log, ms: Date.now() - t0 }));
});

await waitUp();
const files = fs.readdirSync(here).filter(f => f.endsWith('.cjs') && (!filters.length || filters.some(w => f.includes(w)))).sort();
let bad = 0;
for (const f of files) {
  const r = await run(f);
  const ok = r.code === 0;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${f.replace('.cjs', '')}  ${(r.ms / 1000).toFixed(1)}s`);
  if (!ok || process.env.VERBOSE) console.log(r.log.split('\n').map(l => '    ' + l).join('\n'));
}
console.log(bad ? `\n${bad} 个没通过` : `\n全部通过（${files.length} 个）`);
stop();
process.exit(bad ? 1 : 0);
