<script setup>
/* 空状态：一小块棋盘画、一句话、一个去处 */
defineProps({ title: String, text: String });
</script>

<template>
  <div class="empty card">
    <svg class="art" viewBox="0 0 120 90" aria-hidden="true">
      <rect x="4" y="4" width="112" height="82" rx="6" fill="#DCB575"/>
      <path d="M14 14H106M14 30H106M14 46H106M14 62H106M14 78H106M14 14V78M30 14V78M46 14V78M62 14V78M78 14V78M94 14V78" stroke="rgba(52,34,12,.4)" stroke-width="1"/>
      <circle cx="46" cy="46" r="7" fill="#1C1D1C"/><circle cx="62" cy="46" r="7" fill="#F1F0E8" stroke="rgba(0,0,0,.25)"/><circle cx="62" cy="30" r="7" fill="none" stroke="#B3261E" stroke-width="1.6" stroke-dasharray="3 2.5"/>
    </svg>
    <b>{{ title }}</b>
    <p v-if="text">{{ text }}</p>
    <slot/>
  </div>
</template>
