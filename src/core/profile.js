/* ================= 玩家档案：本地数据按角色分开存 =================
   所有 gomoku-xxx 键都自动存到当前角色名下（gomoku@<角色id>/xxx），各处代码照常读写，不用改。
   gomoku-profiles 记着有哪些角色、当前是谁；每个角色 { id, name, g: 'm'|'f', st: 建角色时是否开剧情, t }。切换、新建、删除角色后整页重载。
   新版第一次打开时（还没有 gomoku-profiles），清掉旧版留下的所有数据。 */

import { reactive } from 'vue';

export let PROFILE;
const PACK_APP = 'pingjian';                                                // 备份数据的标记，导入时核对
const LEGACY_PACK_APPS = new Set(['gomoku-linxi']);                         // 改名前导出的备份仍可导入
/* ---- 启动（最先）：接管 localStorage 的读写，按当前角色分开存 ---- */
export function __init() {
  PROFILE = (() => {
    const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
    const nop = { cur: null, list: [], ok: false, create() {}, use() {}, rename() {}, set() {}, remove() {}, dump() { return null; }, restore() { return '这个浏览器不能保存数据'; } };
    if (!LS) return nop;
    const proto = Storage.prototype, gi = proto.getItem, si = proto.setItem, ri = proto.removeItem;
    let frozen = false;                                                     // 导入后到重载前：不再写入，免得旧页面的状态盖掉导入的数据
    const keys = pre => { const ks = []; try { for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && k.startsWith(pre)) ks.push(k); } } catch (e) {} return ks; };
    let P = null;
    try { P = JSON.parse(gi.call(LS, 'gomoku-profiles') || 'null'); } catch (e) {}
    if (!P || !Array.isArray(P.list)) { keys('gomoku').forEach(k => { try { ri.call(LS, k); } catch (e) {} }); P = { list: [], cur: null }; }
    const cur = P.list.find(p => p.id === P.cur) || P.list[0] || null;
    P.cur = cur ? cur.id : null;
    const ns = cur ? cur.id : '_pending';
    const map = k => (typeof k === 'string' && k.startsWith('gomoku-') && k !== 'gomoku-profiles') ? `gomoku@${ns}/${k.slice(7)}` : k;
    proto.getItem = function (k) { return gi.call(this, this === LS ? map(k) : k); };
    proto.setItem = function (k, v) { if (frozen && this === LS) return; return si.call(this, this === LS ? map(k) : k, v); };
    proto.removeItem = function (k) { if (frozen && this === LS) return; return ri.call(this, this === LS ? map(k) : k); };
    const purge = id => keys(`gomoku@${id}/`).forEach(k => { try { ri.call(LS, k); } catch (e) {} });
    if (!cur) purge('_pending');
    const save = () => { try { si.call(LS, 'gomoku-profiles', JSON.stringify(P)); } catch (e) {} };
    const reload = () => { try { location.reload(); } catch (e) {} };
    // 响应式：改名、换模样后刊头、档案页马上跟着变。改的是 P 里的同一份数据，存的时候存 P
    const R = reactive({ ok: true, cur, list: P.list });
    return Object.assign(R, {
      create(name, g, st) { const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); P.list.push({ id, name, g: g === 'f' ? 'f' : 'm', st: st === false ? 0 : 1, t: Date.now() }); P.cur = id; save(); purge('_pending'); reload(); },
      use(id) { if (P.list.some(p => p.id === id)) { P.cur = id; save(); reload(); } },
      rename(name) { if (R.cur) { R.cur.name = name; save(); } },
      set(k, v) { if (R.cur) { R.cur[k] = v; save(); } },
      remove(id) { purge(id); P.list = P.list.filter(p => p.id !== id); if (P.cur === id) P.cur = P.list[0] ? P.list[0].id : null; save(); reload(); },
      // 导出：所有角色的全部数据（原样的键值）+ 外观设置，换设备时整份导入
      dump() {
        const data = {};
        [...keys('gomoku@'), 'gomoku_theme'].forEach(k => { if (k.startsWith('gomoku@_pending/')) return; const v = gi.call(LS, k); if (v != null) data[k] = v; });
        data['gomoku-profiles'] = JSON.stringify(P);
        return { app: PACK_APP, v: 1, t: Date.now(), roles: P.list.map(p => p.name), data };
      },
      // 导入：按角色合并。同一个角色（id 相同）用导入的数据整份替换，其他角色保留；成功后重载，出错返回原因
      restore(pack) {
        const bad = '不是有效的枰间备份数据';
        if (!pack || (pack.app !== PACK_APP && !LEGACY_PACK_APPS.has(pack.app)) || !pack.data || typeof pack.data !== 'object') return bad;
        let Q = null;
        try { Q = JSON.parse(pack.data['gomoku-profiles']); } catch (e) {}
        if (!Q || !Array.isArray(Q.list) || !Q.list.length || !Q.list.every(p => p && typeof p.id === 'string' && /^[\w-]+$/.test(p.id) && typeof p.name === 'string')) return bad;
        const ids = new Set(Q.list.map(p => p.id));
        const list = P.list.filter(p => !ids.has(p.id));
        Q.list.forEach(p => {                                               // 和本机其他角色重名的，加个后缀区分
          let name = p.name.slice(0, 8), n = 2;
          while (list.some(x => x.name === name)) name = p.name.slice(0, 6) + '·' + n++;
          list.push({ id: p.id, name, g: p.g === 'f' ? 'f' : 'm', st: p.st === 0 ? 0 : 1, t: +p.t || Date.now() });
        });
        try {
          ids.forEach(purge);
          Object.entries(pack.data).forEach(([k, v]) => {
            if (typeof v !== 'string') return;
            const m = /^gomoku@([\w-]+)\//.exec(k);
            if ((m && ids.has(m[1])) || k === 'gomoku_theme') si.call(LS, k, v);
          });
          P.list = list; P.cur = ids.has(Q.cur) ? Q.cur : Q.list[0].id;
          si.call(LS, 'gomoku-profiles', JSON.stringify(P));
        } catch (e) { return '存储空间不足，导入没有完成'; }
        frozen = true; reload(); return '';
      },
    });
  })();
}
