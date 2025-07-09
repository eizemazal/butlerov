<template>
    <v-card class="h-100 w-100 pt-8">
      <v-tabs
        v-model="active_tab_index"
        class="w-100"
        @update:model-value="onTabSwitch()"
      >
        <v-tab
          v-for="(tab, tab_index) in tabs"
          :key="tab_index"
        >
        {{ format_title(tab.filepath) }}
        <v-icon
            v-if="active_tab_index === tab_index"
            @click="closeTab(tab_index)"
          >
            mdi-close
        </v-icon>
        </v-tab>
      </v-tabs>
      <v-card-text class="h-100 w-100">
      <v-tabs-window
        v-model="active_tab_index"
        class="h-100 w-100"
      >
        <v-tabs-window-item
          v-for="(tab, tab_index) in tabs"
          :key="tab_index"
          :transition="false"
          :reverse-transition="false"
          class="h-100 w-100 p-0"
        >
          <VueButlerov
            :ref="setEditorRef"
            v-model="tabs[tab_index].document"
            mode="scheme"
            @update:model-value="tabs[tab_index].modified = true"
          />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
    </v-card>
</template>


<script setup lang="ts">
import { watch, ref, onBeforeUpdate, VNodeRef} from 'vue';
//import ButlerovEditor from './ButlerovEditor.vue';
import { NotebookTab } from './types';

import { NativeConverter, MolConverter, SmilesConverter, Converter, Graph } from '@butlerov-chemistry/core';
import VueButlerov from "@butlerov-chemistry/vue"


const active_tab_index = ref<number>(0);
const tabs = ref<NotebookTab[]>(
  [{document: {
  mime: "application/butlerov",
  objects: [
    {
      type: "Graph",
      vertices:[], edges: []
    }]
  },
  filepath: "",
  modified: false
}])

const editor_refs = ref<VNodeRef[]>([]);

onBeforeUpdate( () => editor_refs.value = [] );
//@ts-expect-error implicit any, could not match argument type to what :ref is expecting
const setEditorRef = (el) => {
  if (el) {
    editor_refs.value.push(el);
  }
}

const active_tab = defineModel<NotebookTab|null>('active_tab', {
  default: null,
});

watch(() => active_tab_index.value, (v) => {
  if (tabs.value.length == 0 || v > tabs.value.length-1)
    active_tab.value = null;
  else
    active_tab.value = tabs.value[v];
});

watch( tabs.value, (v) => {
  if (v.length == 0) {
    active_tab_index.value = -1;
  }
  else if (active_tab_index.value >= v.length) {
    active_tab_index.value = v.length-1;
  }
  if (active_tab_index.value != -1)
    active_tab.value = v[active_tab_index.value];
});

function filename_to_converter(filename: string): Converter | null {
    const last_dot_idx = filename.lastIndexOf(".");
    const extension = filename.slice(last_dot_idx + 1).toLowerCase();
    let converter = null;
    if (extension == "json")
        converter = new NativeConverter();
    if (["sdf", "mol"].includes(extension))
        converter = new MolConverter();
    else if (extension == "smi")
        converter = new SmilesConverter();
    return converter;
}

function serialize_data(filepath: string): string | null {
  const converter = filename_to_converter(filepath);
  if (converter === null)
    return null;
  let data = null;
  if (typeof converter.document_to_string === "function") {
    data = converter.document_to_string(active_tab.value?.document);
  }
  else if (typeof converter.graph_to_string === "function") {
    const graph: Graph = active_tab.value?.document.objects[0] as Graph;
    if (graph === null)
      return null;
    data = converter.graph_to_string(graph);
  }
  else {
    console.error("Converter for this file type does not support write");
    return null;
  }
  return data;
}

window.electronAPI.on('menu-file-new', () => {
  tabs.value.push({document: {
    mime: "application/butlerov",
    objects: [
      {
        type: "Graph",
        vertices:[], edges: []
      }]
    },
    filepath: "",
    modified: false
  });
  active_tab_index.value = tabs.value.length - 1;
})

window.electronAPI.on('menu-file-save', async () => {
  if (!active_tab.value)
    return;

  const filepath = active_tab.value.filepath !== "" ? active_tab.value.filepath : await window.electronAPI.showSaveAsDialog();
  if (!filepath)
    return;

  const data = serialize_data(filepath);

  if (data !== null && window.electronAPI.writeFile(filepath, data)) {
    active_tab.value.filepath = filepath;
    active_tab.value.modified = false;
  }
})

window.electronAPI.on('menu-file-save-as', async () => {
  if (!active_tab.value)
    return;

  const filepath = await window.electronAPI.showSaveAsDialog();
  if (!filepath)
    return;

  const data = serialize_data(filepath);

  if (data !== null && window.electronAPI.writeFile(filepath, data)) {
    active_tab.value.filepath = filepath;
    active_tab.value.modified = false;
  }
})

window.electronAPI.on('menu-file-open', async () => {
  const filepath = await window.electronAPI.showOpenDialog();
  if (!filepath)
    return;

  const converter = filename_to_converter(filepath);

  const data = await window.electronAPI.readFile(filepath);

  if (data === undefined)
    return;

  let doc = undefined;
    //@ts-expect-error ts does not support function|undefined well
    if (typeof converter.document_from_string === "function") {
        //@ts-expect-error ts does not support function|undefined well
        doc = converter.document_from_string(data);
    }
    //@ts-expect-error ts does not support function|undefined well
    else if (typeof converter.graph_from_string === "function") {
        //@ts-expect-error ts does not support function|undefined well
        const graph: Graph = converter.graph_from_string(data)
        doc = {
            mime: "application/butlerov",
            objects: [graph]
        }
    }
    else {
        console.error("Converter for this file type does not support read");
        return;
    }


  tabs.value.push({
    document: doc,
    filepath: filepath,
    modified: false
  });
  active_tab_index.value = tabs.value.length - 1;
});


window.electronAPI.on('menu-file-close', () => closeTab(active_tab_index.value));


function format_title(filepath: string): string {
  if (filepath == "")
    return "untitled";
  return filepath.split(/[/|\\\\]/).slice(-1)[0];
}

function closeTab(tab_index: number) {
  if (!tabs.value[tab_index].modified || confirm(`Are you sure to close ${tabs.value[tab_index].filepath}?`)) {
    tabs.value.splice(tab_index, 1);
  }
}

function onTabSwitch() {
  active_tab.value = tabs.value[active_tab_index.value];
}

</script>