<script setup lang="ts">
import VueButlerov from "./VueButlerov.vue";
import { ref, onMounted } from "vue";
import type { Graph } from "@butlerov-chemistry/core";

const params = new URLSearchParams(
  typeof window !== "undefined" ? window.location.search : "",
);

const binding = ref<"native" | "mol">(
  (params.get("binding") as "native" | "mol") || "native",
);
const disabled = ref(params.get("disabled") === "1");
const autofocus = ref(params.get("autofocus") !== "0");

const model = ref<Graph>({
  type: "Graph",
  vertices: [],
  edges: [],
});

const mol = ref("");

const butlerovRef = ref<{ editor?: { graph: Graph } } | null>(null);

onMounted(() => {
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_binding__ = binding.value;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_model__ = () => model.value;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_set_model__ = (g: Graph) => {
    model.value = g;
  };
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_mol__ = () => mol.value;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_vertex_count__ = () =>
    butlerovRef.value?.editor?.graph?.vertices?.length ?? 0;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_is_container_focused__ = () => {
    const el = document.querySelector(
      "[data-testid=\"butlerov-container\"]",
    ) as HTMLElement | null;
    return el !== null && document.activeElement === el;
  };
});
</script>

<template>
  <div id="app">
    <VueButlerov
      v-if="binding === 'native'"
      ref="butlerovRef"
      v-model="model"
      :disabled="disabled"
      :autofocus="autofocus"
    />
    <VueButlerov
      v-else
      ref="butlerovRef"
      v-model:mol="mol"
      :disabled="disabled"
      :autofocus="autofocus"
    />
  </div>
  <textarea
    v-if="binding === 'mol'"
    v-model="mol"
    data-testid="mol-input"
  />
</template>

<style scoped>
[data-testid="butlerov-container"] {
  min-width: 300px;
  min-height: 300px;
  display: block;
}
</style>
