<script setup>
/* 规则选择：先选一组（日常 / 世界五子棋 / 世界连珠），再在组里选一种；下面是所选规则的说明。
   换组时选中那一组上次选的（没选过就选第一项，也就是现行的世锦赛规则）。选项来自 game/rulesets.js。人机、双人对弈设置页共用。 */
import { computed, reactive } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui';
import { RULE_GROUPS, RULESETS, rulesetById } from '../game/rulesets.js';
import Segmented from './Segmented.vue';

const props = defineProps({ modelValue: String, idPrefix: { type: String, default: 'rs' } });
const emit = defineEmits(['update:modelValue']);
const cur = computed(() => rulesetById(props.modelValue));
const last = reactive({});                           // 每组上次选的
const group = computed(() => cur.value.group);
const items = computed(() => RULESETS.filter(r => r.group === group.value));
const gNote = computed(() => RULE_GROUPS.find(g => g.id === group.value).note);
const GROUPS = RULE_GROUPS.map(g => ({ value: g.id, label: g.name }));
function pickGroup(g) {
  if (g === group.value) return;
  last[group.value] = props.modelValue;
  emit('update:modelValue', last[g] || RULESETS.find(r => r.group === g).id);
}
</script>

<template>
  <div class="rp">
    <Segmented :model-value="group" :options="GROUPS" label="规则类别" :id="idPrefix + 'Group'" @update:model-value="pickGroup"/>
    <p class="rp-gnote">{{ gNote }}</p>
    <ToggleGroupRoot type="single" class="rp-list" :model-value="modelValue" aria-label="规则" @update:model-value="v => v && emit('update:modelValue', v)">
      <ToggleGroupItem v-for="r in items" :key="r.id" :value="r.id" class="rp-i" :id="idPrefix + '-' + r.id">
        <i class="rp-dot" aria-hidden="true"></i><b>{{ r.name }}</b><small>{{ r.brief }}</small>
      </ToggleGroupItem>
    </ToggleGroupRoot>
    <p class="rp-desc" :id="idPrefix + 'Desc'">{{ cur.desc }}</p>
  </div>
</template>
