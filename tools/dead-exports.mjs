// 找用不着的导出：
//   没人用 —— 别的模块没 import、本模块也没用到、测试里也没提到：可以删
//   不用导出 —— 只有本模块自己在用：可以去掉 export
// 测试脚本（tests/*.cjs）通过 window 用到的名字、被 import * as 整个引入的模块不算。
import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';
const files = fs.readdirSync('src', { recursive: true }).map(f => f.split(path.sep).join('/')).filter(f => /\.(js|vue)$/.test(f) && f !== 'expose.js');
const tests = fs.readdirSync('tests').filter(f => f.endsWith('.cjs')).map(f => fs.readFileSync('tests/' + f, 'utf8')).join('\n');
const code = f => { const s = fs.readFileSync('src/' + f, 'utf8'); if (!f.endsWith('.vue')) return { s, c: s }; const m = s.match(/<script setup>\n([\s\S]*?)<\/script>/); return { s, c: m ? m[1] : '' }; };
const imported = new Set(), wholesale = new Set();
for (const f of files) {
  const { s } = code(f);
  for (const m of s.matchAll(/import \{([^}]*)\}/g)) m[1].split(',').forEach(x => imported.add(x.trim().split(/\s+as\s+/)[0]));
  for (const m of s.matchAll(/import \* as \w+ from '([^']+)'/g)) wholesale.add(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])));
}
let n = 0;
for (const f of files) {
  if (!f.endsWith('.js') || wholesale.has(f) || f === 'features/debug.js') continue;
  const { c } = code(f);
  const ast = espree.parse(c, { ecmaVersion: 2023, sourceType: 'module', range: true });
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2023, sourceType: 'module' });
  const mod = sm.scopes.find(x => x.type === 'module');
  const out = [];
  for (const st of ast.body) {
    if (st.type !== 'ExportNamedDeclaration' || !st.declaration) continue;
    const d = st.declaration, names = d.id ? [d.id.name] : d.declarations.map(x => x.id.name);
    for (const n of names) {
      if (n.startsWith('__') || imported.has(n)) continue;
      if (new RegExp(`\\b${n}\\b`).test(tests)) continue;
      const v = mod.set.get(n), selfUse = v && v.references.some(r => !(r.init && r.writeExpr));
      out.push(selfUse ? `${n}（不用导出）` : `${n}（没人用）`);
    }
  }
  if (out.length) { console.log(f + ': ' + out.join(' ')); n += out.length; }
}
console.log(n ? `${n} 个导出用不着` : '导出都有人用');
