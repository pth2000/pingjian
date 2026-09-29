// 检查 src/ 下每个模块（含 .vue 的 <script setup>）的 import：
//   - 用到了没声明、也没 import 的名字（漏了 import）
//   - import 了对方模块并没有导出的名字
//   - import 了却没用到的名字
// 用法：npm run check；加 -- --fix 自动修（补上漏掉的 import、删掉多余的）。
import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

const fix = process.argv.includes('--fix');
const BROWSER = new Set(('Array Blob Boolean Date Error Event FileReader Infinity Int16Array Int32Array Int8Array Uint8Array Uint16Array Uint32Array '
  + 'Float32Array Float64Array JSON Map Math MutationObserver Number Object Promise Proxy Reflect RegExp ResizeObserver Set WeakMap WeakSet '
  + 'Storage String Symbol URL Worker addEventListener clearTimeout clearInterval console document fetch getComputedStyle history localStorage '
  + 'sessionStorage location matchMedia navigator parseFloat parseInt isNaN isFinite performance removeEventListener requestAnimationFrame '
  + 'cancelAnimationFrame setInterval setTimeout undefined window self globalThis structuredClone queueMicrotask AudioContext Image HTMLElement '
  + 'Node devicePixelRatio innerWidth innerHeight scrollTo alert confirm TextEncoder TextDecoder encodeURIComponent decodeURIComponent atob btoa '
  + 'CSS DOMParser KeyboardEvent PointerEvent Intl BigInt AbortController indexedDB crypto OffscreenCanvas import '
  + 'defineProps defineEmits defineExpose defineModel withDefaults').split(' '));

const files = fs.readdirSync('src', { recursive: true }).map(f => f.split(path.sep).join('/')).filter(f => /\.(js|vue)$/.test(f));
const read = f => fs.readFileSync('src/' + f, 'utf8');
function parse(f) {
  const s = read(f);
  let code = s, off = 0, tpl = '';
  if (f.endsWith('.vue')) {
    const m = s.match(/<script setup>\n([\s\S]*?)<\/script>/); if (!m) return null;
    code = m[1]; off = s.indexOf(m[1]);
    const t = s.match(/<template>([\s\S]*)<\/template>/); tpl = t ? t[1] : '';
  }
  return { s, code, off, tpl, ast: espree.parse(code, { ecmaVersion: 2023, sourceType: 'module', range: true }) };
}
const resolve = (from, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));

// 每个 .js 模块导出了哪些名字
const exportsIn = {}, exporter = {};
for (const f of files) {
  if (!f.endsWith('.js')) continue;
  const names = exportsIn[f] = new Set();
  for (const st of parse(f).ast.body) {
    if (st.type !== 'ExportNamedDeclaration') continue;
    const d = st.declaration;
    if (d && d.id) names.add(d.id.name);
    else if (d && d.declarations) d.declarations.forEach(x => names.add(x.id.name));
    st.specifiers.forEach(x => names.add(x.exported.name));
  }
  for (const n of names) if (!n.startsWith('__') || n.startsWith('__set_')) exporter[n] ??= f;
}

let bad = 0;
for (const f of files) {
  const p = parse(f); if (!p) continue;
  const edits = [], notes = [];
  const sm = eslintScope.analyze(p.ast, { ecmaVersion: 2023, sourceType: 'module' });
  const mod = sm.scopes.find(x => x.type === 'module');
  const used = n => { const v = mod.set.get(n); return (v && v.references.length > 0) || (p.tpl && new RegExp(`\\b${n.replace(/\$/g, '\\$')}\\b`).test(p.tpl)); };

  // import 的名字：对方没导出的、没用到的
  for (const st of p.ast.body) {
    if (st.type !== 'ImportDeclaration' || !st.source.value.startsWith('.') || !/\.js$/.test(st.source.value)) continue;
    const target = resolve(f, st.source.value), ex = exportsIn[target];
    const named = st.specifiers.filter(x => x.type === 'ImportSpecifier');
    if (!named.length || named.length !== st.specifiers.length) continue;
    const keep = named.filter(x => {
      const n = x.local.name;
      if (ex && !ex.has(x.imported.name)) { notes.push(`${st.source.value} 没有导出 ${x.imported.name}`); return false; }
      if (!used(n)) { notes.push(`没用到 ${n}`); return false; }
      return true;
    });
    if (keep.length === named.length) continue;
    const txt = keep.length ? `import { ${keep.map(x => x.imported.name === x.local.name ? x.local.name : `${x.imported.name} as ${x.local.name}`).join(', ')} } from '${st.source.value}';` : '';
    let [a, z] = st.range; if (!txt && p.code[z] === '\n') z++;
    edits.push([a, z, txt]);
  }

  // 用到了却没有声明、也没 import 的名字
  const free = [...new Set([...mod.through, ...sm.globalScope.through].map(r => r.identifier.name))].filter(n => !BROWSER.has(n));
  const known = free.filter(n => exporter[n] && exporter[n] !== f), unknown = free.filter(n => !exporter[n]);
  if (unknown.length) notes.push(`不认识的名字 ${unknown.join(' ')}`);
  if (known.length) {
    notes.push(`漏了 import ${known.join(' ')}`);
    const by = {}; known.forEach(n => (by[exporter[n]] ||= []).push(n));
    const lines = Object.entries(by).map(([d, ns]) => {
      let r = path.posix.relative(path.posix.dirname(f), d); if (!r.startsWith('.')) r = './' + r;
      return `import { ${ns.sort().join(', ')} } from '${r}';`;
    }).join('\n');
    const imps = p.ast.body.filter(x => x.type === 'ImportDeclaration');
    const at = imps.length ? imps[imps.length - 1].range[1] : 0;
    edits.push([at, at, (imps.length ? '\n' : '') + lines + (imps.length ? '' : '\n')]);
  }

  // 模板里调用的函数（@click="go('x')"、{{ fmt(n) }}、:class="f()"）和事件里直接写的函数名，必须在 <script setup> 里有：
  // 模板拿不到 window 上的名字，漏了 import 时点了没反应、控制台才报错
  if (p.tpl) {
    const exprs = [...p.tpl.matchAll(/(?:@[\w.:-]+|v-on:[\w.:-]+|:[\w.-]+|v-(?:if|else-if|show|html|text|bind|model))="([^"]*)"/g)].map(m => m[1])
      .concat([...p.tpl.matchAll(/\{\{([\s\S]*?)\}\}/g)].map(m => m[1]));
    const handlers = [...p.tpl.matchAll(/(?:@[\w.:-]+|v-on:[\w.:-]+)="\s*([A-Za-z_$][\w$]*)\s*"/g)].map(m => m[1]);
    const called = exprs.flatMap(e => [...e.replace(/'[^']*'|`[^`]*`/g, "''").matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
    const TPL_OK = new Set('Math Date String Number Boolean Array Object JSON parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent Intl'.split(' '));
    const local = new Set([...p.tpl.matchAll(/v-for="\(?([^)"]+?)\)?\s+(?:in|of)\s/g)].flatMap(m => m[1].split(',').map(x => x.trim())));
    const miss = [...new Set([...called, ...handlers])].filter(n => !mod.set.has(n) && !TPL_OK.has(n) && !local.has(n) && !['if', 'for', 'typeof'].includes(n) && !n.startsWith('$'));
    if (miss.length) notes.push(`模板里用到却没声明 / import：${miss.join(' ')}`);
    const knownT = miss.filter(n => exporter[n]);
    if (knownT.length && fix) {
      const by = {}; knownT.forEach(n => (by[exporter[n]] ||= []).push(n));
      const imps = p.ast.body.filter(x => x.type === 'ImportDeclaration'), at = imps.length ? imps[imps.length - 1].range[1] : 0;
      edits.push([at, at, Object.entries(by).map(([d, ns]) => { let r = path.posix.relative(path.posix.dirname(f), d); if (!r.startsWith('.')) r = './' + r; return `\nimport { ${ns.sort().join(', ')} } from '${r}';`; }).join('')]);
    }
  }

  if (!notes.length) continue;
  bad++;
  console.log(`${f}:\n  ${notes.join('\n  ')}`);
  if (fix) {
    let code = p.code;
    for (const [a, z, t] of edits.sort((x, y) => y[0] - x[0])) code = code.slice(0, a) + t + code.slice(z);
    fs.writeFileSync('src/' + f, p.s.slice(0, p.off) + code + p.s.slice(p.off + p.code.length));
  }
}
console.log(bad ? `${bad} 个文件有问题${fix ? '（已尝试修复，再跑一次确认）' : ''}` : 'import 都没问题');
process.exitCode = bad && !fix ? 1 : 0;
