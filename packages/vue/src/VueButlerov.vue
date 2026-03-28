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
import { onMounted, onUnmounted, useTemplateRef, ref, watch, nextTick, computed } from "vue";
import {
  MoleculeEditor,
  Style,
  Theme,
  Graph,
  DrawableObject,
  defaultStyle,
  Converter,
  MolConverter,
  SmilesConverter,
  BUTLEROV_DOCUMENT_FORMAT,
} from "@butlerov-chemistry/core";

defineOptions({
  name: "VueButlerov",
});

const container = useTemplateRef("container");

export type SmilesFormat = string;
export type MolFormat = string;
export type ButlerovMolecule = Graph;

export type VueButlerovStructureModel = SmilesFormat | MolFormat | ButlerovMolecule;
export type VueButlerovSchemaModel = {
  objects: DrawableObject[];
};

export type VueButlerovModel = VueButlerovStructureModel | VueButlerovSchemaModel;

interface Props {
  modelValue?: VueButlerovModel;
  format?: "native" | "smiles" | "mol";
  mode?: "structure" | "scheme";
  style?: Style;
  theme?: Theme | string;
  /** When true, show a hover copy control (Mol/Smiles string or JSON for native graph). */
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
}

const emit = defineEmits(["update:modelValue"]);

const props = withDefaults(defineProps<Props>(), {
  mode: () => "structure",
  format: () => "native",
  theme: () => "light",
  style: () => defaultStyle,
  copyable: true,
  disabled: false,
  autofocus: true,
  zoomFitPadding: 0.05,
  modelValue: (p: Readonly<Props>) => {
    if (p.mode == "structure") {
      if (p.format == "native") {
        return {
          type: "Graph",
          vertices: [],
          edges: [],
        };
      }
      return "";
    }
    if (p.format == "native") {
      return {
        objects: [],
      };
    }
    return "";
  },
});

const editor = ref<MoleculeEditor | null>(null);
const converter = ref<Converter | null>(null);
const hovered = ref(false);
const copied = ref(false);

defineExpose({ editor });

let last_emitted_serialized: string | null = null;

function try_serialize(v: unknown): string | null {
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

const canCopy = computed(() => {
  if (props.mode !== "structure")
    return false;
  const v = props.modelValue;
  if (v === undefined || v === null)
    return false;
  if (typeof v === "string")
    return v.length > 0;
  if (typeof v === "object" && "vertices" in v && Array.isArray((v as Graph).vertices))
    return (v as Graph).vertices.length > 0;
  return true;
});

function setConverterFromFormat() {
  if (props.format == "mol")
    converter.value = new MolConverter();
  else if (props.format == "smiles")
    converter.value = new SmilesConverter();
  else
    converter.value = null;
}

function setEditorValue(v: VueButlerovModel) {
  if (!editor.value)
    return;

  if (props.mode == "scheme") {
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
    return;
  }

  if (converter.value == null) {
    editor.value.graph = v as Graph;
    return;
  }
  if (!converter.value.graph_from_string)
    return;
  editor.value.graph = converter.value.graph_from_string(v as string);
}

function emitEditorValue() {
  if (props.mode == "structure") {
    const payload = converter.value?.graph_to_string && editor.value
      ? converter.value.graph_to_string(editor.value.graph)
      : editor.value?.graph;
    last_emitted_serialized = try_serialize(payload);
    emit("update:modelValue", payload);
  }
  else {
    if (!editor.value)
      return;
    const payload = editor.value.document;
    last_emitted_serialized = try_serialize(payload);
    emit("update:modelValue", payload);
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
  editor.value.theme = props.theme;
  editor.value.style = props.style;
  editor.value.readonly = props.disabled;
  editor.value.onchange = () => {
    if (!editor.value)
      return;
    emitEditorValue();
  };
}

async function copyToClipboard(): Promise<void> {
  if (!editor.value || props.mode !== "structure")
    return;
  let text = "";
  try {
    if (converter.value?.graph_to_string)
      text = converter.value.graph_to_string(editor.value.graph);
    else
      text = JSON.stringify(editor.value.graph);
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
  setConverterFromFormat();
  editor.value = new MoleculeEditor({
    stage: container.value,
    mode: props.mode,
    autofocus: props.autofocus !== false,
  });
  wireEditorInstance();
  setEditorValue(props.modelValue);
  applyStructureViewFit();
});

watch(() => props.format, () => {
  setConverterFromFormat();
  if (editor.value && props.mode === "structure") {
    setEditorValue(props.modelValue);
    applyStructureViewFit();
  }
  if (editor.value)
    emitEditorValue();
});

watch(() => props.theme, (v) => {
  if (!editor.value)
    return;
  editor.value.theme = v;
});

watch(() => props.style, (v) => {
  if (!editor.value)
    return;
  editor.value.style = v;
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

watch(() => props.modelValue, (v) => {
  const incoming_serialized = try_serialize(v);
  if (incoming_serialized !== null && incoming_serialized === last_emitted_serialized)
    return;
  setEditorValue(v);
  applyStructureViewFit();
}, { deep: false });

onMounted(() => {
  if (!container.value)
    return;
  setConverterFromFormat();
  editor.value = new MoleculeEditor({
    stage: container.value,
    mode: props.mode,
    autofocus: props.autofocus !== false,
  });
  wireEditorInstance();
  setEditorValue(props.modelValue);
  applyStructureViewFit();
});

onUnmounted(() => {
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
