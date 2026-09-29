<script setup>
import { ui } from '../stores/ui.js';
</script>

<template>
  <div class="toast" id="toast" :hidden="!ui.toast.on">{{ ui.toast.msg }}</div>
</template>
