<script setup>
/* 陪练头像：coaches.js 里有图片就用图，其次 avatars.js 的矢量画像，都没有就写一个字。
   pop 变了就重新创建元素，弹一下的动画重放。 */
import { computed } from 'vue';
import { faceHTML } from '../../game/coach.js';

const props = defineProps({ pc: Object, mood: { type: String, default: 'idle' }, pop: { type: Number, default: 0 } });
const art = computed(() => (props.pc ? faceHTML(props.pc, props.mood) : null));
const letter = computed(() => (props.pc ? props.pc.face || props.pc.name.slice(-1) : '陈'));
</script>

<template>
  <span v-if="art" :key="pop" class="face art" :class="{ pop: pop > 0 }" v-html="art"></span>
  <span v-else :key="-pop - 1" class="face" :class="{ pop: pop > 0 }">{{ letter }}</span>
</template>
