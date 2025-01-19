<template>
    <v-card class="h-100 w-100 pt-8">
      <v-tabs
        v-model="active_tab_index"
        class="w-100"
        @update:model-value="onTabChange()"
      >
        <v-tab
          v-for="(tab, tab_index) in tabs"
          :key="`tab-${tab_index}`"
          :value="tab_index"
        >
        {{ tab.filename }}
        <v-icon
            v-if="active_tab_index === tab_index"
            @click="closeActiveTab()"
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
          :key="`tab-content-${tab_index}`"
          :transition="false"
          :reverse-transition="false"
          :value="tab_index"
          class="h-100 w-100 p-0"
        >
          <FileNotebookTab v-model="tabs[tab_index]" @update:model-value="onFileChange(tab_index)" />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card-text>
    </v-card>
</template>


<script setup lang="ts">
import {onMounted, ref} from 'vue';
import FileNotebookTab from './FileNotebookTab.vue';
import { NotebookTab } from './types';

const tabs = ref<NotebookTab[]>([]);

tabs.value.push({document: {
  mime: "application/butlerov",
  objects: [
    {
      type: "Graph",
      vertices:[], edges: []
    }]
  },
  filename: "untitiled",
  modified: false
});


window.electronAPI.on('menu-file-new', () => {
  tabs.value.push({document: {
    mime: "application/butlerov",
    objects: [
      {
        type: "Graph",
        vertices:[], edges: []
      }]
    },
    filename: "untitiled",
    modified: false
  });
  active_tab_index.value = tabs.value.length - 1;
})

window.electronAPI.on('menu-file-close', () => closeActiveTab());


const active_tab_index = defineModel<number>({default: 0});
const active_tab = defineModel<NotebookTab>('active_tab');


function closeActiveTab() {
  if (!active_tab.value?.modified || confirm(`Are you sure to close ${active_tab.value.filename}?`)) {
    let new_active_tab_index = active_tab_index.value - 1;
    if (new_active_tab_index < 0 && tabs.value.length > 1)
      active_tab_index.value = 0;
    tabs.value.splice(active_tab_index.value, 1);
    active_tab_index.value = new_active_tab_index;
  }
}

function onTabChange() {
  active_tab.value = tabs.value[active_tab_index.value];
}

function onFileChange(tab_index: number) {
  if (tab_index === active_tab_index.value)
    active_tab.value = tabs.value[active_tab_index.value];
}

onMounted( () => {
  active_tab.value = tabs.value[active_tab_index.value];
})
</script>