<template>
  <VueButlerov
    v-model="model"
    mode="structure"
    format="native"
    data-testid="butlerov-container"
  />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import VueButlerov from './VueButlerov.vue';
import type { Graph } from '@butlerov-chemistry/core';

const model = ref<Graph>({
  type: 'Graph',
  vertices: [],
  edges: []
});

// Expose model to window for Playwright
// @ts-expect-error: attach for E2E test
window.model = model;
</script>
<style scoped>
[data-testid="butlerov-container"] {
  min-width: 300px;
  min-height: 300px;
  display: block;
}
</style>