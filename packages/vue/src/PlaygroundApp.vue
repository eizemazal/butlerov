<script setup lang="ts">
import VueButlerov from "./VueButlerov.vue";
import { ref, onMounted } from "vue";
import type { Graph } from "@butlerov-chemistry/core";

const model = ref<Graph>({
  type: "Graph",
  vertices: [],
  edges: []
});

// Expose model to window for Playwright tests
onMounted(() => {
    // @ts-expect-error: Exposing for E2E testing
    window.__butlerov_test_model__ = model;
    
    // Also expose a getter function for easier access
    // @ts-expect-error: Exposing for E2E testing
    window.__butlerov_get_model__ = () => model.value;
});
</script>

<template>
  <div id="app">
    <h1>Butlerov Chemistry Structure Drawer</h1>
    <VueButlerov v-model="model" />
  </div>
</template>

<style scoped>
[data-testid="butlerov-container"] {
  min-width: 300px;
  min-height: 300px;
  display: block;
}
</style>
