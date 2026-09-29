<script setup>
/* 分段选择（单选）：Reka UI 的 ToggleGroup，键盘左右键切换、读屏都照顾到 */
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';

defineProps({ modelValue: [String, Number], options: Array, label: String });
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <ToggleGroupRoot type="single" class="segm" :model-value="modelValue" :aria-label="label" @update:model-value="v => v != null && v !== '' && emit('update:modelValue', v)">
    <ToggleGroupItem v-for="o in options" :key="o.value" :value="o.value" class="segm-i">{{ o.label }}</ToggleGroupItem>
  </ToggleGroupRoot>
</template>
