<template>
  <div ref="container" style="min-height:300px; min-width:300px" data-testid="butlerov-container" class="butlerov-container w-100 h-100 m-0"></div>
</template>

<script setup lang="ts">

import { onMounted, useTemplateRef, ref, watch } from 'vue';
import { MoleculeEditor, Style, Theme, Graph, DrawableObject, defaultStyle, Converter, MolConverter, SmilesConverter, BUTLEROV_DOCUMENT_FORMAT } from '@butlerov-chemistry/core';

defineOptions({
  name:  "VueButlerov"
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
}

const emit = defineEmits(['update:modelValue']);

const props = withDefaults(defineProps<Props>(), {
  mode: () => "structure",
  format: () => "native",
  theme: () => "light",
  style: () => defaultStyle,
  modelValue: (props: Readonly<Props>) => {
    if (props.mode == "structure") {
      if (props.format == "native") {
        return {
          type: "Graph",
          vertices: [],
          edges: []
        }
      }
      return "";
    }
    if (props.format == "native") {
      return {
        objects: []
      }
    }
    return "";
  }
});

const editor = ref<MoleculeEditor>();

const theme_name = ref("light");

const converter = ref<Converter | null>(null);

defineExpose({editor});

let last_emitted_serialized: string | null = null;

function try_serialize(v: unknown): string | null {
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}


function setEditorValue(v: VueButlerovModel) {
  if (!editor.value)
    return;

  if (props.mode == "scheme") {
    // native scheme model is already a document-like object (not a string)
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

  // structure mode
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

watch(() => props.mode, (v) => {
  if (!container.value) {
        return;
    }
  editor.value = new MoleculeEditor({stage: container.value, mode: props.mode});
  if (v == "scheme" && !(converter.value?.document_from_string && converter.value.document_to_string))
    converter.value = null;
  if (v == "structure" && !(converter.value?.graph_from_string && converter.value.graph_to_string))
    converter.value = null;
})

watch(() => props.format, (v) => {
  if (v == "mol")
    converter.value = new MolConverter();
  else if (v == "smiles")
    converter.value = new SmilesConverter();
  else
    converter.value = null;

  emitEditorValue();
})

watch(() => props.theme, (v) => {
  if (!editor.value)
    return;
  editor.value.theme = v;
})

watch(() => props.style, (v) => {
  if (!editor.value)
    return;
  editor.value.style = v;
}, {deep: true})

watch(() => props.modelValue, (v) => {
  // Prevent feedback loop: editor emits -> parent updates v-model -> watch fires -> we'd reset editor state
  const incoming_serialized = try_serialize(v);
  if (incoming_serialized !== null && incoming_serialized === last_emitted_serialized)
    return;
  setEditorValue(v);
}, {deep: false})


onMounted(() => {
    if (!container.value) {
        return;
    }
    editor.value = new MoleculeEditor({stage: container.value, mode: props.mode});
    editor.value.theme = theme_name.value;
    setEditorValue(props.modelValue);
    //setTimeout(() => editor.value?.center_view(), 100);
    editor.value.onchange = () => {
      if (!editor.value)
        return;
      emitEditorValue();
    }
});

</script>

<style>
.vue-butlerov {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}
</style>