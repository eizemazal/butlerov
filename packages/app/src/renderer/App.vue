<template>
  <v-app>
    <v-navigation-drawer
      rail
      permanent
    >
      <v-tabs
        v-model="tool_tab"
        direction="vertical"
        :mandatory="false"
      >
        <v-tab value="properties"><v-icon size="x-large">mdi-molecule</v-icon></v-tab>
        <v-tab value="style"><v-icon size="x-large">mdi-palette-swatch-variant</v-icon></v-tab>
      </v-tabs>
    </v-navigation-drawer>
    <v-navigation-drawer
      v-if="!!tool_tab"
      permanent
    >
      <v-tabs-window v-model="tool_tab">
        <v-tabs-window-item value="properties">
          <SidebarProperties
            :document="active_tab?.document"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="style">
          <SidebarStyle v-if="!!active_tab && active_tab.document.style" v-model="style"/>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-navigation-drawer>
    <v-main width="100%" height="100%">
      <FileNotebook v-model:active_tab="active_tab" />
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import {ref, computed} from "vue";

import SidebarStyle from "./components/SidebarStyle.vue";
import SidebarProperties from "./components/SidebarProperties.vue";
import FileNotebook from "./components/FileNotebook.vue";
import { NotebookTab } from "./components/types";

const active_tab = ref<NotebookTab>();

const style = computed( {
  get: () => active_tab?.value?.document.style,
  set: (v) => {
    if (active_tab.value)
      active_tab.value.document.style = v;
  }
})

const tool_tab = ref("properties");
</script>

<style type="text/css">
.v-tab {
  text-transform: none !important;
}
</style>