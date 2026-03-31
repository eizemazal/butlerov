<template>
  <div
    class="vue-butlerov-wrapper"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div
      ref="container"
      class="butlerov-stage-host"
      data-testid="butlerov-container"
    />
    <div
      v-if="copyable && canCopy"
      class="copy-btn"
      data-testid="butlerov-copy"
      :class="{ visible: hovered }"
      @click.stop.prevent="copyToClipboard"
      @mousedown.stop
      @mouseup.stop
    >
      <div
        v-if="copied"
        class="copied-msg"
      >
        Copied
      </div>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="9"
          y="9"
          width="13"
          height="13"
          rx="2"
          ry="2"
        />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onUnmounted,
  useTemplateRef,
  ref,
  shallowRef,
  watch,
  nextTick,
  computed,
  useAttrs,
} from "vue";
import {
  MoleculeEditor,
  Style,
  Theme,
  Graph,
  DrawableObject,
  defaultStyle,
  Converter,
  MolConverter,
  MW,
  Formula,
  ExactMass,
  BUTLEROV_DOCUMENT_FORMAT,
} from "@butlerov-chemistry/core";

defineOptions({
  name: "VueButlerov",
});

const container = useTemplateRef("container");

export type MolFormat = string;
export type ButlerovMolecule = Graph;

export type VueButlerovStructureModel = MolFormat | ButlerovMolecule;
export type VueButlerovSchemaModel = {
  objects: DrawableObject[];
};

export type VueButlerovModel = VueButlerovStructureModel | VueButlerovSchemaModel;
export type VueButlerovDescriptorKey = "mw" | "formula" | "formula_html" | "exact_mass";
export type VueButlerovDescriptorValues = Partial<Record<VueButlerovDescriptorKey, number | string>>;

interface Props {
  modelValue?: VueButlerovModel;
  /** Bound with `v-model:mol` (MOL string). */
  mol?: string;
  mode?: "structure" | "scheme";
  style?: Style;
  theme?: Theme | string;
  /** When true, show a hover copy control (MOL string or JSON for native graph). */
  copyable?: boolean;
  /** Read-only structure (no editing); maps to core `readonly`. */
  disabled?: boolean;
  /** Focus the drawing surface on mount (keyboard shortcuts). @default true */
  autofocus?: boolean;
  /**
   * Extra margin for zoom-to-fit as a fraction of stage size (e.g. 0.08).
   * Core fits using label/bond bounds; a little padding keeps card edges clear.
   */
  zoomFitPadding?: number;
  /**
   * List of descriptor keys to compute lazily.
   * Values are emitted via `v-model:descriptors`.
   */
  descriptorKeys?: VueButlerovDescriptorKey[];
  /**
   * Current descriptor values for `v-model:descriptors`.
   */
  descriptors?: VueButlerovDescriptorValues;
  /**
   * Optional per-descriptor debounce overrides in milliseconds.
   */
  descriptorDebounceMs?: Partial<Record<VueButlerovDescriptorKey, number>>;
}

const emit = defineEmits<{
  "update:modelValue": [value: VueButlerovModel];
  "update:mol": [value: string];
  "update:descriptors": [value: VueButlerovDescriptorValues];
  /** Fired when MOL/native graph parsing or loading fails; editor is reset to an empty structure. */
  error: [error: Error];
}>();

// Explicit defaults for optional v-model props (vue/require-default-prop). `undefined` keeps `v-model:mol`-only usage working.
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  mol: undefined,
  mode: () => "structure",
  theme: () => "light",
  style: () => defaultStyle,
  copyable: true,
  disabled: false,
  autofocus: true,
  zoomFitPadding: 0.05,
  descriptorKeys: () => [],
  descriptors: () => ({}),
  descriptorDebounceMs: () => ({}),
});

const attrs = useAttrs();

/** Which v-model props are actually passed (input channel). */
const providedInputs = computed(() => ({
  native: props.modelValue !== undefined,
  mol: props.mol !== undefined,
}));

const inputCount = computed(
  () => Object.values(providedInputs.value).filter(Boolean).length,
);

/** Single source of truth for loading the editor: native graph/document or MOL string. */
const activeInput = computed((): "native" | "mol" => {
  if (props.mol !== undefined)
    return "mol";
  return "native";
});

/** Which update listeners the parent registered (output channel; multiple allowed). */
function hasUpdateListener(key: "modelValue" | "mol"): boolean {
  const a = attrs as Record<string, unknown>;
  if (key === "modelValue")
    return !!(a["onUpdate:modelValue"] ?? a.onUpdateModelValue);
  return !!(a["onUpdate:mol"] ?? a.onUpdateMol);
}

/**
 * Outputs: listeners in attrs (public) plus the active input channel — `v-model` listeners
 * are not always visible on attrs when paired with declared emits, so we always emit the
 * channel that backs the single bound input.
 */
const wantsNativeEmit = computed(
  () => hasUpdateListener("modelValue") || activeInput.value === "native",
);
const wantsMolEmit = computed(
  () => hasUpdateListener("mol") || activeInput.value === "mol",
);

if (inputCount.value > 1) {
  throw new Error(
    "[VueButlerov] Only one input format can be used at a time. Use only one of: v-model or v-model:mol.",
  );
}

const editor = shallowRef<MoleculeEditor | null>(null);
const converter = shallowRef<Converter | null>(null);
const hovered = ref(false);
const copied = ref(false);

defineExpose({ editor });

let last_emitted_serialized: string | null = null;
const descriptorState = ref<VueButlerovDescriptorValues>({});
const descriptorTimers = new Map<VueButlerovDescriptorKey, ReturnType<typeof setTimeout>>();
const defaultDescriptorDebounceMs: Record<VueButlerovDescriptorKey, number> = {
  mw: 100,
  formula: 30,
  formula_html: 40,
  exact_mass: 180,
};

/** Snapshot for echo suppression: MOL stays raw string; native graph/document use JSON. */
function valueForDedupe(v: unknown): string | null {
  if (v === undefined || v === null)
    return null;
  if (typeof v === "string")
    return v;
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

/** Serialize graph to MOL; reuse `converter` when it is already a MolConverter (e.g. v-model:mol). */
function graphToMolString(g: Graph): string {
  const c = converter.value;
  if (c?.graph_to_string)
    return c.graph_to_string(g);
  return new MolConverter().graph_to_string(g);
}

const canCopy = computed(() => {
  if (props.mode !== "structure")
    return false;
  const v = activeInput.value === "mol" ? props.mol : props.modelValue;
  if (v === undefined || v === null)
    return false;
  if (typeof v === "string")
    return v.length > 0;
  if (typeof v === "object" && "vertices" in v && Array.isArray((v as Graph).vertices))
    return (v as Graph).vertices.length > 0;
  return true;
});

function defaultGraph(): Graph {
  return { type: "Graph", vertices: [], edges: [] };
}

function cloneStyle(style: Style): Style {
  return {
    ...style,
    themes: style.themes.map((t: Theme) => ({ ...t })),
  };
}

function applyThemeToEditor() {
  if (!editor.value)
    return;
  if (typeof props.theme === "string") {
    const mapped = editor.value.style.themes.find((t: Theme) => t.name === props.theme);
    // Use Theme object from the (possibly just-updated) style to force repaint,
    // even when theme name itself did not change.
    editor.value.theme = mapped ?? props.theme;
    return;
  }
  editor.value.theme = props.theme;
}


 /**
  * Strip reactivity and set default value for null / undefined.
  * @param v Input in native format
  */

function cleanupGraph(v: unknown): Graph {
  if (v === undefined || v === null)
    return defaultGraph();
  if (typeof v !== "object")
    return defaultGraph();
  try {
    return JSON.parse(JSON.stringify(v)) as Graph;
  }
  catch {
    return defaultGraph();
  }
}

function setConverterFromActiveInput() {
  if (activeInput.value === "mol")
    converter.value = new MolConverter();
  else
    converter.value = null;
}

function getActiveModelValue(): VueButlerovModel | string {
  if (activeInput.value === "mol")
    return props.mol ?? "";
  return (props.modelValue ?? defaultGraph()) as VueButlerovModel;
}

function setEditorValue(v: VueButlerovModel | string | undefined) {
  if (!editor.value)
    return;

  if (props.mode == "scheme") {
    try {
      if (converter.value == null) {
        editor.value.document = {
          format: BUTLEROV_DOCUMENT_FORMAT,
          ...(v as VueButlerovSchemaModel),
        };
        return;
      }
      if (!converter.value.document_from_string)
        return;
      editor.value.document = converter.value.document_from_string(v as string);
    }
    catch (e) {
      editor.value.document = {
        format: BUTLEROV_DOCUMENT_FORMAT,
        objects: [],
      };
      last_emitted_serialized = valueForDedupe(v);
      emit("error", e instanceof Error ? e : new Error(String(e)));
    }
    return;
  }

  try {
    if (converter.value == null) {
      editor.value.graph = cleanupGraph(v);
      return;
    }
    if (!converter.value.graph_from_string)
      return;
    editor.value.graph = converter.value.graph_from_string(v);
  }
  catch (e) {
    editor.value.graph = defaultGraph();
    last_emitted_serialized = valueForDedupe(v);
    emit("error", e instanceof Error ? e : new Error(String(e)));
  }
}

function emitEditorValue() {
  if (!editor.value)
    return;

  if (props.mode == "structure") {
    const g = editor.value.graph;
    let molStr: string | undefined;

    if (wantsNativeEmit.value)
      emit("update:modelValue", g);
    if (wantsMolEmit.value) {
      const m = graphToMolString(g);
      molStr = m;
      emit("update:mol", m);
    }

    if (activeInput.value === "native") {
      last_emitted_serialized = valueForDedupe(g);
    }
    else {
      if (molStr === undefined)
        molStr = graphToMolString(g);
      last_emitted_serialized = valueForDedupe(molStr);
    }
    return;
  }

  const doc = editor.value.document;
  const g = editor.value.graph;
  let molStr: string | undefined;

  if (wantsNativeEmit.value)
    emit("update:modelValue", doc);
  if (wantsMolEmit.value) {
    const m = graphToMolString(g);
    molStr = m;
    emit("update:mol", m);
  }

  if (activeInput.value === "native") {
    last_emitted_serialized = valueForDedupe(doc);
  }
  else {
    if (molStr === undefined)
      molStr = graphToMolString(g);
    last_emitted_serialized = valueForDedupe(molStr);
  }
}

function computeDescriptor(key: VueButlerovDescriptorKey, g: Graph): number | string | undefined {
  if (key === "mw") {
    const v = new MW(g).compute();
    return Number.isFinite(v) ? v : undefined;
  }
  if (key === "formula")
    return new Formula(g).compute_as_string();
  if (key === "formula_html")
    return new Formula(g).compute_as_html();
  if (key === "exact_mass") {
    const v = new ExactMass(g).compute();
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
}

function emitDescriptors() {
  emit("update:descriptors", { ...descriptorState.value });
}

function syncDescriptorKeys() {
  const requested = new Set(props.descriptorKeys);
  for (const [key, timer] of descriptorTimers.entries()) {
    if (!requested.has(key)) {
      clearTimeout(timer);
      descriptorTimers.delete(key);
    }
  }
  const next: VueButlerovDescriptorValues = {};
  for (const key of props.descriptorKeys) {
    if (descriptorState.value[key] !== undefined)
      next[key] = descriptorState.value[key];
  }
  descriptorState.value = next;
  emitDescriptors();
}

function scheduleDescriptorComputation() {
  if (!editor.value)
    return;
  const g = editor.value.graph;
  for (const key of props.descriptorKeys) {
    const running = descriptorTimers.get(key);
    if (running)
      clearTimeout(running);
    const timeoutMs = props.descriptorDebounceMs[key] ?? defaultDescriptorDebounceMs[key];
    const timer = setTimeout(() => {
      descriptorTimers.delete(key);
      const value = computeDescriptor(key, g);
      descriptorState.value = {
        ...descriptorState.value,
        [key]: value,
      };
      emitDescriptors();
    }, timeoutMs);
    descriptorTimers.set(key, timer);
  }
}

function applyStructureViewFit() {
  if (props.mode !== "structure" || !editor.value)
    return;
  nextTick(() => {
    requestAnimationFrame(() => {
      editor.value?.zoom_to_fit(false, props.zoomFitPadding);
      editor.value?.center_view();
    });
  });
}

function wireEditorInstance() {
  if (!editor.value)
    return;
  editor.value.style = cloneStyle(props.style);
  applyThemeToEditor();
  editor.value.readonly = props.disabled;
  editor.value.onchange = () => {
    if (!editor.value)
      return;
    emitEditorValue();
    scheduleDescriptorComputation();
  };
}

async function copyToClipboard(): Promise<void> {
  if (!editor.value || props.mode !== "structure")
    return;
  let text = "";
  try {
    if (wantsMolEmit.value) {
      text = graphToMolString(editor.value.graph);
    }
    else {
      text = JSON.stringify(editor.value.graph);
    }
  }
  catch {
    return;
  }
  if (!text)
    return;
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1000);
  }
  catch {
    /* ignore */
  }
}

watch(() => props.mode, () => {
  if (!container.value)
    return;
  editor.value?.stage.destroy();
  editor.value = null;
  setConverterFromActiveInput();
  editor.value = new MoleculeEditor({
    stage: container.value,
    mode: props.mode,
    autofocus: props.autofocus !== false,
  });
  wireEditorInstance();
  setEditorValue(getActiveModelValue());
  applyStructureViewFit();
});

watch(() => props.theme, () => {
  if (!editor.value)
    return;
  applyThemeToEditor();
});

watch(() => props.style, (v) => {
  if (!editor.value)
    return;
  editor.value.style = cloneStyle(v);
  applyThemeToEditor();
}, { deep: true });

watch(() => props.disabled, (v) => {
  if (!editor.value)
    return;
  editor.value.readonly = v;
});

watch(() => props.autofocus, (v) => {
  const el = editor.value?.stage.container();
  if (!el)
    return;
  if (v)
    el.focus();
  else
    el.blur();
});

watch(() => props.zoomFitPadding, () => {
  applyStructureViewFit();
});

watch(() => props.descriptorKeys, () => {
  syncDescriptorKeys();
  scheduleDescriptorComputation();
}, { deep: true });

watch(() => props.descriptors, (v) => {
  descriptorState.value = { ...(v ?? {}) };
}, { deep: true });

watch(
  () => {
    if (activeInput.value === "mol")
      return props.mol ?? "";
    return props.modelValue;
  },
  (v) => {
    const effective
      = v === undefined && activeInput.value === "native"
        ? defaultGraph()
        : v;
    const incoming_serialized = valueForDedupe(effective);
    if (incoming_serialized !== null && incoming_serialized === last_emitted_serialized)
      return;
    setEditorValue(effective as VueButlerovModel | string | undefined);
    scheduleDescriptorComputation();
    applyStructureViewFit();
  },
  { deep: false },
);

onMounted(() => {
  if (!container.value)
    return;
  setConverterFromActiveInput();
  editor.value = new MoleculeEditor({
    stage: container.value,
    mode: props.mode,
    autofocus: props.autofocus !== false,
  });
  wireEditorInstance();
  setEditorValue(getActiveModelValue());
  syncDescriptorKeys();
  scheduleDescriptorComputation();
  applyStructureViewFit();
});

onUnmounted(() => {
  for (const timer of descriptorTimers.values())
    clearTimeout(timer);
  descriptorTimers.clear();
  if (editor.value) {
    editor.value.onchange = () => {};
    editor.value.clear(false);
    editor.value.stage.destroy();
    editor.value = null;
  }
});
</script>

<style scoped>
.vue-butlerov-wrapper {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 120px;
}

.butlerov-stage-host {
  width: 100%;
  height: 100%;
  min-height: inherit;
}

.copy-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  cursor: pointer;
  color: #666;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.copy-btn.visible {
  opacity: 1;
}

.copy-btn:hover {
  color: #333;
  background: rgba(255, 255, 255, 0.95);
}

.copied-msg {
  font-size: 12px;
  color: #22c55e;
  font-weight: 500;
  padding: 2px 4px;
}
</style>
