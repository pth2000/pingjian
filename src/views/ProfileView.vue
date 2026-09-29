<script setup>
/* 档案：当前角色、交情、剧情模式开关（和调试）、外观、角色列表（切换 / 新建 / 删除） */
import PageHeader from '../components/PageHeader.vue';
import Segmented from '../components/Segmented.vue';
import Toggle from '../components/Toggle.vue';
import { colorPref } from '../ui/theme.js';
import { NAV_MORE, NAV_RULES } from '../ui/nav.js';
import { computed, ref } from 'vue';
import { ui } from '../stores/ui.js';
import { PROFILE } from '../core/profile.js';
import { OPPONENTS } from '../engine/engine.js';
import { oppFace, oppKnown } from '../story/portraits.js';
import { plainFace, playerFace } from '../story/player-face.js';
import { ST, bondBar, fmtDay, genderPick, showCreate, stSave, stageName, stageOf } from '../story/story.js';
import { arcOf } from '../story/bonds.js';
import { ACH, ACHS } from '../features/achievements.js';
import { DBG, dbgOpen, dbgSet } from '../features/debug.js';
import { OPP_COL } from '../ui/state.js';
import { esc } from '../openings/tree.js';
import { inProgress } from '../ui/settings.js';
import { ask, toast } from '../ui/dialogs.js';
import { saveGame } from '../game/save.js';
import { go } from '../ui/views.js';

const gOf = x => (x.g === 'f' ? 'f' : 'm');

const v = computed(() => {
  if (!ui.booted) return null;
  const p = PROFILE.cur;
  if (!p) return null;
  const known = OPPONENTS.filter(o => oppKnown(o.id));
  return {
    name: p.name, face: ST.on ? playerFace(gOf(p)) : plainFace(), since: fmtDay(p.t),
    total: ST.total, achN: ACHS.filter(a => ACH.got[a.id]).length, achAll: ACHS.length,
    story: ST.on && ST.got.length > 0, pages: ST.got.length, tales: OPPONENTS.reduce((a, o) => a + arcOf(o.id), 0),
    on: ST.on, dbg: DBG.on,
    bondsNote: known.length < OPPONENTS.length ? `认识了 ${known.length} 位，还有 ${OPPONENTS.length - known.length} 位没熟起来` : '六位都认识了',
    bonds: ST.on ? known.map(o => ({ id: o.id, name: o.name, col: OPP_COL[o.id], heart: stageOf(o.id) >= 5, face: oppFace(o.id), stage: (ST.cnt[o.id] || 0) ? stageName(o.id) : '未见过', bar: bondBar(o.id) })) : [],
    others: PROFILE.list.filter(x => x.id !== p.id).map(x => ({ id: x.id, name: x.name, face: ST.on ? playerFace(gOf(x)) : plainFace(), since: fmtDay(x.t) })),
  };
});

// 手机上的「去处」：札记（剧情开着时）、战绩、棋谱、成就、规则
const go2 = computed(() => ui.booted ? [...NAV_MORE.filter(n => !n.story || ST.on), NAV_RULES].map(n => ({ ...n, dot: (n.v === 'notes' && ST.freshW > 0) || (n.v === 'ach' && ACH.fresh.length > 0) })) : []);
async function rename() {
  const p = PROFILE.cur;
  // 模样只在剧情模式里有意义（剧情头像、熟客的称呼）；关着时只改称呼
  const ok = await ask({ title: ST.on ? '称呼与模样' : '修改称呼', html: `${ST.on ? genderPick(gOf(p), 'pfG') : ''}<input id="pfNewName" class="pf-input" maxlength="8" value="${esc(p.name)}">${ST.on ? '<p class="pf-note">熟客对你的称呼随模样而不同。</p>' : ''}`, ok: '保存' });
  if (!ok) return;
  const nv = ((document.getElementById('pfNewName') || {}).value || '').trim();
  const ng = (document.querySelector('input[name="pfG"]:checked') || {}).value || gOf(p);
  if (!nv || PROFILE.list.some(x => x.name === nv && x.id !== p.id)) { toast(nv ? '已有同名角色' : '称呼不能为空'); return; }
  PROFILE.rename(nv); PROFILE.set('g', ng);
}
function toggleStory(on) { ST.on = on; stSave(); toast(ST.on ? '剧情模式已开启' : '剧情模式已关闭'); }
const openDbg = () => dbgOpen();
function dbgOff() { dbgSet(false); }
const newRole = () => showCreate(true);
async function del() {
  const p = PROFILE.cur;
  if (!(await ask({ title: `删除「${p.name}」？`, text: '这个角色的战绩、棋谱、成就、交情和札记都会清除，不能恢复。', ok: '删除', danger: true }))) return;
  PROFILE.remove(p.id);
}
/* ---- 数据迁移：导出成备份文件、从备份文件导入 ---- */
const fileIn = ref(null);
function pack() { if (inProgress()) saveGame(); return JSON.stringify(PROFILE.dump()); }
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`; };
// 在 claude.ai 里打开时，下载要经过查看器的 downloads 能力（会先请查看的人确认）；单独打开的离线版直接用下载链接
async function hostDownloads() {
  try { return window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; } catch (e) { return null; }
}
async function exportFile() {
  const name = `pingjian-backup-${stamp()}.json`, data = pack();
  const dl = await hostDownloads();
  if (dl) {
    try { await dl.save({ filename: name, data }); toast('备份文件已保存'); }
    catch (e) { if (e && e.code === 'declined') return; toast(e && e.code === 'rate_limited' ? '请先处理已打开的保存提示' : '这里不能保存文件，请在浏览器里单独打开后再导出'); }
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('备份文件已导出');
  } catch (e) { toast('导出失败，请换个浏览器再试'); }
}
async function importPack(txt) {
  let data = null;
  try { data = JSON.parse(String(txt || '').trim()); } catch (e) {}
  if (!data || !data.data) { toast('不是有效的枰间备份数据'); return; }
  const roles = Array.isArray(data.roles) ? data.roles.filter(r => typeof r === 'string').slice(0, 12) : [];
  const when = data.t ? fmtDay(data.t) : '';
  if (!(await ask({ title: '导入备份？', text: `备份${when ? `导出于 ${when}，` : ''}含 ${roles.length ? `「${roles.join('」「')}」` : '若干'}角色。与本机同一角色的数据会被备份替换，本机其他角色保留。导入后页面会重新载入。`, ok: '导入', danger: true }))) return;
  const err = PROFILE.restore(data);
  if (err) toast(err);
}
const pickFile = () => fileIn.value && fileIn.value.click();
function onFile(e) {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = () => importPack(r.result);
  r.onerror = () => toast('读取文件失败');
  r.readAsText(f);
}
async function use(id) {
  if (inProgress() && !(await ask({ title: '切换角色？', text: '当前这局会保存在这个角色名下，切回来还能接着下。', ok: '切换' }))) return;
  PROFILE.use(id);
}
</script>

<template>
  <section class="view v-profile page" data-v="profile" aria-label="我的">
    <PageHeader title="我的" :sub="v && v.on ? '角色、交情、剧情、外观与数据' : '角色、剧情、外观与数据'"/>
    <div id="pfBody">
      <template v-if="v">
        <section class="pf-card"><span class="pf-big pf-face" v-html="v.face"></span>
          <div class="pf-id"><h3>{{ v.name }}</h3><small>{{ v.on ? '初到临溪' : '创建于' }} · {{ v.since }}</small>
            <div class="pf-stats"><span><b>{{ v.total }}</b>盘人机</span><span><b>{{ v.achN }}</b>/ {{ v.achAll }} 成就</span><template v-if="v.story"><span><b>{{ v.pages }}</b>页心事</span><span><b>{{ v.tales }}</b>段故事</span></template></div></div>
          <button type="button" class="pf-rename" id="pfRename" @click="rename">修改</button></section>

        <!-- 手机上：侧栏里的那些去处都收在这里 -->
        <nav class="pf-go" aria-label="去处">
          <a v-for="n in go2" :key="n.v" :href="'#/' + n.v" class="card pf-goi" @click.prevent="go(n.v)"><component :is="n.icon" class="ic" aria-hidden="true"/><span>{{ n.label }}</span><i v-if="n.dot" class="dotnew"></i></a>
        </nav>

        <section v-if="v.bonds.length" class="pf-sec"><h4>交情<small>{{ v.bondsNote }}</small></h4><div class="pf-bonds">
          <button v-for="o in v.bonds" :key="o.id" type="button" class="pf-bond" :class="{ heart: o.heart }" :data-nt="o.id" :style="{ '--oc': o.col }"><span class="pf-bf" v-html="o.face"></span><span class="pf-bt"><b>{{ o.name }}</b><em>{{ o.stage }}</em></span><span class="pf-bb" v-html="o.bar"></span></button>
        </div></section>

        <section class="pf-sec"><h4>剧情</h4>
          <div class="card pf-tg"><Toggle id="pfStory" :model-value="v.on" label="剧情模式" :note="v.on ? '交情、札记与人物故事' : ''" @update:model-value="toggleStory"/></div>
          <div v-if="v.dbg" class="pf-dbg"><button type="button" id="pfDbg" @click="openDbg">调试面板</button><button type="button" class="linkish" id="pfDbgOff" @click="dbgOff">关闭调试模式</button></div></section>

        <section class="pf-sec"><h4>外观<small>记在这台设备上</small></h4>
          <Segmented v-model="colorPref" label="外观" :options="[{ value: 'auto', label: '跟随系统' }, { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }]"/></section>

        <section class="pf-sec"><h4>角色<small>每个角色的数据互不相干</small></h4><div class="pf-list">
          <div class="pf-row cur"><span class="pf-sm pf-face" v-html="v.face"></span><b>{{ v.name }}</b><small>当前</small></div>
          <div v-for="x in v.others" :key="x.id" class="pf-row"><span class="pf-sm pf-face" v-html="x.face"></span><b>{{ x.name }}</b><small>{{ x.since }}</small><button type="button" :data-pf-use="x.id" @click="use(x.id)">切换</button></div>
          </div><div class="pf-acts"><button type="button" id="pfNew" @click="newRole">新建角色</button><button type="button" class="pf-del" id="pfDel" @click="del">删除当前角色</button></div></section>

        <section class="pf-sec"><h4>数据<small>换设备、换浏览器时迁移</small></h4>
          <p class="pf-io-note">备份文件包含这台设备上所有角色的战绩、棋谱、成就和进行中的对局{{ v.on ? '，以及交情与札记' : '' }}。数据只存在本机浏览器里，清除浏览器数据或换设备前请先导出。</p>
          <div class="card pf-io-box">
            <div class="pf-io-row"><b>导出<small>这台设备上的所有角色</small></b><div class="pf-io-btns"><button type="button" id="pfExport" @click="exportFile">导出备份文件</button></div></div>
            <div class="pf-io-row"><b>导入<small>同一角色的数据以备份为准，其他角色保留</small></b><div class="pf-io-btns"><button type="button" id="pfImport" @click="pickFile">选择备份文件</button></div></div>
            <input ref="fileIn" type="file" accept=".json,application/json,text/plain" hidden @change="onFile"></div></section>
      </template>
    </div>
  </section>
</template>
