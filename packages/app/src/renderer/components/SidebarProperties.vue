<template>
  <v-list class="properties-list">
    <v-list-subheader>Analytical properties</v-list-subheader>
    <v-list-item>
      <v-sheet
        class="descriptor-card pa-3"
        rounded="lg"
        border
      >
        <div class="descriptor-row">
          <span class="descriptor-label">Molecular weight</span>
          <strong class="descriptor-value">{{ mwText }}</strong>
        </div>
        <div class="descriptor-row">
          <span class="descriptor-label">Exact mass</span>
          <strong class="descriptor-value">{{ exactMassText }}</strong>
        </div>
        <div class="descriptor-row descriptor-formula">
          <span class="descriptor-label">Composition</span>
          <strong
            class="descriptor-value"
            v-html="compositionText"
          />
        </div>
      </v-sheet>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { DescriptorValues } from "./types";

interface PropInterface {
  descriptors?: DescriptorValues;
}

const props = defineProps<PropInterface>();

function descriptorNumber(v: number | string | undefined): number | null {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  if (!Number.isFinite(n))
    return null;
  return n;
}

const mwValue = computed(() => descriptorNumber(props.descriptors?.mw));
const exactMassValue = computed(() =>
  descriptorNumber(props.descriptors?.exact_mass ?? props.descriptors?.exact_mass),
);

const mwText = computed(() => (mwValue.value !== null ? `${mwValue.value.toFixed(2)} g/mol` : "—"));

const exactMassText = computed(() =>
  exactMassValue.value !== null ? `${exactMassValue.value.toFixed(6)} u` : "—",
);

const compositionText = computed(() => props.descriptors?.formula_html || "—");
</script>

<style scoped>
.properties-list {
  padding-bottom: 12px;
}

.descriptor-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.descriptor-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.descriptor-label {
  font-size: 0.76rem;
  opacity: 0.75;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.descriptor-value {
  font-size: 1rem;
}

.descriptor-formula :deep(sub),
.descriptor-formula :deep(sup) {
  font-size: 0.72em;
}
</style>