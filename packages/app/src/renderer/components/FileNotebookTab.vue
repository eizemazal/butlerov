<template>
    <div
ref="container"
        class="w-100 h-100 m-0"
    ></div>
</template>
<script setup lang="ts">
import { onMounted, useTemplateRef, ref } from 'vue';
import { MoleculeEditor, darkTheme } from 'butlerov';
import { NotebookTab } from './types';

const container = useTemplateRef("container");

//const model = defineModel<NotebookTab>({default: { graph: {vertices: [], edges: []}, filename: "untitled", modified: false}});

const model = defineModel<NotebookTab>( {
  default: {
    document: {
      mime: "application/butlerov",
      objects: [
        {
          vertices: [],
          edges: []
        }
      ]
    },
    title: "untitled",
    modified: false
  }
} );

const editor = ref<MoleculeEditor>();


onMounted(() => {
    if (!container.value) {
        return;
    }
    editor.value = new MoleculeEditor({stage: container.value, mode: "structure"});
    editor.value.theme = darkTheme;
    editor.value.document = model.value.document;
    editor.value.onchange = () => {
      if (!model.value || !editor.value)
        return;
      model.value.document = editor.value.document;
    }
})

</script>

<style lang="css">
  #editor:focus {
    outline: none;
  }
</style>