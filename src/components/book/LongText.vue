<script setup>
/* 定式全集里的长篇讲解：短的直接显示，长的折叠 */
defineProps({ t: Object });
</script>

<template>
  <p v-if="t.short" class="bk-long"><template v-for="(l, i) in t.lines" :key="i"><br v-if="i">{{ l }}</template></p>
  <details v-else class="bk-long"><summary>讲解</summary><p><template v-for="(l, i) in t.lines" :key="i"><br v-if="i">{{ l }}</template></p></details>
</template>
