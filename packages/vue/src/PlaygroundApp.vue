<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  defaultStyle,
  MolConverter,
  SmilesConverter,
  type Graph,
  type MoleculeEditor,
  type Style,
  type Theme,
} from "@butlerov-chemistry/core";
import VueButlerov from "./VueButlerov.vue";
import type { VueButlerovDescriptorKey, VueButlerovDescriptorValues } from "./VueButlerov.vue";

const params = new URLSearchParams(
  typeof window !== "undefined" ? window.location.search : "",
);

const binding = ref<"native" | "mol">(
  (params.get("binding") as "native" | "mol") || "native",
);
const disabled = ref(params.get("disabled") === "1");
const autofocus = ref(params.get("autofocus") !== "0");
const error = ref("");

const model = ref<Graph>({
  type: "Graph",
  vertices: [],
  edges: [],
});
const mol = ref("");
const smiles = ref("");
const serializedText = ref("");
const descriptorKeys: VueButlerovDescriptorKey[] = ["mw", "formula_html"];
const descriptors = ref<VueButlerovDescriptorValues>({});
let syncingSerializedFromState = false;

const style = ref<Style>({
  ...defaultStyle,
  themes: defaultStyle.themes.map((t: Theme) => ({ ...t })),
});
const theme = ref(style.value.themes[0]?.name || "light");

const butlerovRef = ref<{ editor?: MoleculeEditor } | null>(null);
const molConverter = new MolConverter();
const smilesConverter = new SmilesConverter();

const styleFieldKeys = computed(
  () => Object.keys(style.value).filter((k) => !["name", "themes"].includes(k)),
);

const activeTheme = computed(
  () =>
    style.value.themes.find((t: Theme) => t.name === theme.value)
    || style.value.themes[0]
    || null,
);
const themeFieldKeys = computed(
  () => Object.keys(activeTheme.value || {}).filter((k) => k !== "name"),
);

function currentEditorGraph(): Graph {
  const g = butlerovRef.value?.editor?.graph;
  return g || { type: "Graph", vertices: [], edges: [] };
}

const mwText = computed(() => {
  const mw = descriptors.value.mw;
  if (typeof mw !== "number" || !Number.isFinite(mw))
    return "";
  return `Molecular weight: ${mw.toFixed(2)}`;
});
const compositionText = computed(() => {
  const formula = descriptors.value.formula_html;
  if (typeof formula !== "string" || !formula)
    return "";
  return `Composition: ${formula}`;
});

function setStyleField(field: string, rawValue: string | boolean) {
  const current = (style.value as Record<string, unknown>)[field];
  let value: unknown = rawValue;
  if (typeof current === "number") {
    const parsed = parseFloat(`${rawValue}`);
    if (Number.isNaN(parsed))
      return;
    value = parsed;
  }
  style.value = {
    ...style.value,
    [field]: value,
    themes: style.value.themes.map((t: Theme) => ({ ...t })),
  };
}

function setThemeField(field: string, rawValue: string | boolean) {
  const active = activeTheme.value;
  if (!active)
    return;
  const current = (active as Record<string, unknown>)[field];
  let value: unknown = rawValue;
  if (typeof current === "number") {
    const parsed = parseFloat(`${rawValue}`);
    if (Number.isNaN(parsed))
      return;
    value = parsed;
  }
  style.value = {
    ...style.value,
    themes: style.value.themes.map((t: Theme) =>
      t.name === active.name ? { ...t, [field]: value } : { ...t }),
  };
}

function humanize(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function styleFieldValue(field: string): unknown {
  return (style.value as Record<string, unknown>)[field];
}

function styleFieldIsBoolean(field: string): boolean {
  return typeof styleFieldValue(field) === "boolean";
}

function styleFieldIsNumber(field: string): boolean {
  return typeof styleFieldValue(field) === "number";
}

function themeFieldValue(field: string): unknown {
  return ((activeTheme.value || {}) as Record<string, unknown>)[field];
}

function themeFieldIsBoolean(field: string): boolean {
  return typeof themeFieldValue(field) === "boolean";
}

function themeFieldIsNumber(field: string): boolean {
  return typeof themeFieldValue(field) === "number";
}

function onEditorError(e: unknown) {
  error.value = String(e);
}

function clearErrors() {
  error.value = "";
}

function clearDrawing() {
  clearErrors();
  butlerovRef.value?.editor?.clear();
}

function applyGraphFromModel(g: Graph) {
  if (binding.value === "native")
    model.value = g;
  else
    mol.value = molConverter.graph_to_string(g);
}

const serializedInputTitle = computed(() => (
  binding.value === "native"
    ? "Read/write native Graph JSON"
    : "Read/write .mol format (ctab)"
));

function syncSerializedTextFromState() {
  syncingSerializedFromState = true;
  if (binding.value === "native")
    serializedText.value = JSON.stringify(model.value, null, 2);
  else
    serializedText.value = mol.value;
  syncingSerializedFromState = false;
}

function getSmiles() {
  clearErrors();
  try {
    smiles.value = smilesConverter.graph_to_string(currentEditorGraph());
  }
  catch (e) {
    error.value = String(e);
  }
}

function readSmiles() {
  clearErrors();
  try {
    const graph = smilesConverter.graph_from_string(smiles.value);
    applyGraphFromModel(graph);
  }
  catch (e) {
    error.value = String(e);
  }
}

watch(() => binding.value, () => {
  syncSerializedTextFromState();
});

watch(() => model.value, () => {
  if (binding.value === "native")
    syncSerializedTextFromState();
}, { deep: true });

watch(() => mol.value, () => {
  if (binding.value === "mol") {
    syncSerializedTextFromState();
    if (error.value) {
      try {
        molConverter.graph_from_string(mol.value);
        clearErrors();
      }
      catch {
        // Keep current error message while input is still invalid.
      }
    }
  }
});

watch(() => serializedText.value, (text) => {
  if (syncingSerializedFromState)
    return;
  clearErrors();
  if (binding.value === "native") {
    const trimmed = text.trim();
    if (!trimmed) {
      model.value = { type: "Graph", vertices: [], edges: [] };
      return;
    }
    try {
      const parsed = JSON.parse(text) as Graph;
      if (!parsed || parsed.type !== "Graph" || !Array.isArray(parsed.vertices) || !Array.isArray(parsed.edges))
        throw new Error("Input is not a valid Graph JSON object.");
      model.value = parsed;
    }
    catch (e) {
      error.value = String(e);
    }
    return;
  }
  mol.value = text;
});

onMounted(() => {
  syncSerializedTextFromState();
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
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_set_style_field__ = (field: string, value: string | boolean) => {
    setStyleField(field, value);
  };
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_set_theme_field__ = (field: string, value: string | boolean) => {
    setThemeField(field, value);
  };
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_editor_style__ = () => butlerovRef.value?.editor?.style;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_editor_theme__ = () => butlerovRef.value?.editor?.theme;
  // @ts-expect-error Exposing for E2E testing
  window.__butlerov_get_descriptors__ = () => descriptors.value;
});
</script>

<template>
  <div class="page-wrapper">
    <div class="column-left">
      <h2>Draw molecule (Vue)</h2>
      <p>Use mouse. Hover atoms/bonds and press spacebar for context menu.</p>
      <button @click="clearDrawing">
        Clear
      </button>
      <div class="inline-controls">
        <label
          class="inline-label"
          for="binding-select"
        >Binding Mode</label>
        <select
          id="binding-select"
          v-model="binding"
        >
          <option value="native">
            native
          </option>
          <option value="mol">
            mol
          </option>
        </select>
        <input
          id="readonly-chkbx"
          v-model="disabled"
          type="checkbox"
        >
        <label
          class="inline-label"
          for="readonly-chkbx"
        >Read only</label>
      </div>      

      <div class="editor-host">
        <VueButlerov
          v-if="binding === 'native'"
          ref="butlerovRef"
          v-model="model"
          v-model:descriptors="descriptors"
          :style="style"
          :theme="theme"
          :disabled="disabled"
          :autofocus="autofocus"
          :descriptor-keys="descriptorKeys"
          @error="onEditorError"
        />
        <VueButlerov
          v-else
          ref="butlerovRef"
          v-model:mol="mol"
          v-model:descriptors="descriptors"
          :style="style"
          :theme="theme"
          :disabled="disabled"
          :autofocus="autofocus"
          :descriptor-keys="descriptorKeys"
          @error="onEditorError"
        />
      </div>
      <span id="error">{{ error }}</span>
      <p class="descriptors">
        <span>{{ mwText }}</span><br>
        <span v-html="compositionText" />
      </p>

      <h2>Read/write SMILES</h2>
      <div>
        <button @click="getSmiles">
          Get as text
        </button>
        <button @click="readSmiles">
          Read from text
        </button>
      </div>
      <input
        v-model="smiles"
        type="text"
        class="smiles"
      >

      <h2>{{ serializedInputTitle }}</h2>
      <textarea
        v-model="serializedText"
        data-testid="mol-input"
      />
    </div>

    <div class="column-right">
      <h2>Drawing settings</h2>
      <ul>
        <li class="section">
          Theme preset
        </li>
        <li>
          <label for="theme-select">Theme</label>
          <select
            id="theme-select"
            v-model="theme"
          >
            <option
              v-for="t in style.themes"
              :key="t.name"
              :value="t.name"
            >
              {{ t.name }}
            </option>
          </select>
        </li>
      </ul>
      <ul>
        <li class="section control-subtitle">
          Theme properties
        </li>
        <li
          v-for="field in themeFieldKeys"
          :key="`theme-${field}`"
        >
          <label :for="`theme-${field}`">{{ humanize(field) }}</label>
          <input
            v-if="themeFieldIsBoolean(field)"
            :id="`theme-${field}`"
            type="checkbox"
            :checked="Boolean(themeFieldValue(field))"
            @change="setThemeField(field, ($event.target as HTMLInputElement).checked)"
          >
          <input
            v-else-if="themeFieldIsNumber(field)"
            :id="`theme-${field}`"
            type="number"
            step="any"
            :value="String(themeFieldValue(field) ?? '')"
            class="small"
            @change="setThemeField(field, ($event.target as HTMLInputElement).value)"
          >
          <input
            v-else
            :id="`theme-${field}`"
            type="text"
            :value="String(themeFieldValue(field) ?? '')"
            class="large"
            @input="setThemeField(field, ($event.target as HTMLInputElement).value)"
          >
        </li>
      </ul>

      <ul>
        <li class="section control-subtitle">
          Style properties
        </li>
        <li
          v-for="field in styleFieldKeys"
          :key="`style-${field}`"
        >
          <label :for="`style-${field}`">{{ humanize(field) }}</label>
          <input
            v-if="styleFieldIsBoolean(field)"
            :id="`style-${field}`"
            type="checkbox"
            :checked="Boolean(styleFieldValue(field))"
            @change="setStyleField(field, ($event.target as HTMLInputElement).checked)"
          >
          <input
            v-else-if="styleFieldIsNumber(field)"
            :id="`style-${field}`"
            type="number"
            step="any"
            class="small"
            :value="String(styleFieldValue(field))"
            @change="setStyleField(field, ($event.target as HTMLInputElement).value)"
          >
          <input
            v-else
            :id="`style-${field}`"
            type="text"
            class="large"
            :value="String(styleFieldValue(field))"
            @input="setStyleField(field, ($event.target as HTMLInputElement).value)"
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  display: flex;
  gap: 16px;
}

.column-left {
  flex: 70%;
}

.column-right {
  flex: 30%;
  border-left: solid 4px #555;
  padding-left: 14px;
}

.editor-host {
  width: 620px;
  height: 620px;
  border: solid 1px #ddd;
}

p {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt;
}

h2 {
  font: small-caps 12pt Arial;
}

.inline-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.inline-controls .inline-label {
  width: auto;
  margin-right: 2px;
}

textarea {
  width: 600px;
  margin: 20px 5px;
  min-height: 260px;
}

input.smiles {
  width: 300px;
  margin: 20px 5px;
}

label {
  display: inline-block;
  font: 10pt Arial;
  color: #555;
  width: 220px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  padding: 3px 0 3px 12px;
}

li.section {
  font: 12pt Arial;
  padding-left: 0;
}

.control-subtitle {
  margin: 8px 0 6px 0;
  font: 11pt Arial;
  color: #333;
}

input.small {
  width: 40px;
}

input.large {
  width: 140px;
}

#error {
  color: red;
}
</style>
