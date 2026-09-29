<script setup>
/* 页头：毛笔字标题、一句说明、右边的操作。手机上标题在顶栏里，这里只留说明和操作 */
defineProps({ title: String, sub: String, back: String });
defineEmits(['back']);
</script>

<template>
  <header class="ph">
    <div class="ph-t">
      <button v-if="back" type="button" class="btn ghost sm ph-back" @click="$emit('back')">‹ {{ back }}</button>
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="sub">{{ sub }}</p>
    </div>
    <div v-if="$slots.default" class="ph-acts"><slot/></div>
  </header>
</template>
