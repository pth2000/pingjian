<script setup>
/* 开关一行：左边说明，右边开关（Reka UI 的 Switch）。整行都能点 */
import { SwitchRoot, SwitchThumb } from 'reka-ui';

defineProps({ modelValue: Boolean, label: String, note: String, id: String, disabled: Boolean });
defineEmits(['update:modelValue']);
</script>

<template>
  <label class="tg-row" :class="{ off: disabled }">
    <span class="tg-t"><b>{{ label }}</b><small v-if="note">{{ note }}</small></span>
    <SwitchRoot :id="id" class="tg-sw" :model-value="modelValue" :disabled="disabled" @update:model-value="v => $emit('update:modelValue', v)"><SwitchThumb class="tg-th"/></SwitchRoot>
  </label>
</template>
