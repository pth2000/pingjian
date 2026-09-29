<script setup>
/* 开局列表：直指、斜指各 13 局，点一局从第 3 手开始看 */
import { computed, watch, nextTick, ref } from 'vue';
import { ui } from '../../stores/ui.js';
import { BK } from '../../openings/book-page.js';
import { stripView } from '../../openings/book-view.js';
import { pickOpening } from '../../openings/book-layout.js';

const el = ref(null);
const groups = computed(() => { return ui.booted ? stripView() : []; });
// 选中的开局滚到开局条中间（竖列时滚到可见处）
watch(() => BK.op && BK.op.id, async () => {
  await nextTick();
  const L = el.value, on = L && L.querySelector('.bk-op.on');
  if (on) requestAnimationFrame(() => { L.scrollLeft = on.offsetLeft - L.clientWidth / 2 + on.offsetWidth / 2; if (L.scrollHeight > L.clientHeight) L.scrollTop = on.offsetTop - L.clientHeight / 2; });
});
</script>

<template>
  <div ref="el" class="bk-list" id="bkList" role="group" aria-label="选择开局"><template v-if="groups.length"><div v-for="g in groups" :key="g.k" class="bs-grp"><span class="bs-k">{{ g.name }}</span><button v-for="o in g.ops" :key="o.id" type="button" class="bk-op" :class="{ on: o.on }" :data-op="o.id" :aria-pressed="String(o.on)" :title="o.title" @click="pickOpening(o.id)"><i :class="'evd ' + o.ev"></i>{{ o.name }}</button></div><div class="bs-legend" aria-hidden="true"><span><i class="evd b3"></i>黑必胜</span><span><i class="evd b2"></i>黑优</span><span><i class="evd e"></i>大致均衡</span><span><i class="evd w1"></i>白优</span><span>（标准规则的理论评价）</span></div></template></div>
</template>
