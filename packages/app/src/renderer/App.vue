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
            :descriptors="active_tab?.descriptors"
          />
        </v-tabs-window-item>
        <v-tabs-window-item value="style">
          <SidebarStyle
            v-if="active_tab"
            v-model="style"
            v-model:app-theme="appTheme"
            v-model:editor-theme="editorTheme"
          />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-navigation-drawer>
    <v-main width="100%" height="100%">
      <FileNotebook
        v-model:active_tab="active_tab"
        :editor-theme="editorTheme"
      />
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { defaultStyle, Style, Theme } from "@butlerov-chemistry/core";
import { useTheme } from "vuetify";

import SidebarStyle from "./components/SidebarStyle.vue";
import SidebarProperties from "./components/SidebarProperties.vue";
import FileNotebook from "./components/FileNotebook.vue";
import { NotebookTab } from "./components/types";

const active_tab = ref<NotebookTab>();
const vuetifyTheme = useTheme();
const editorTheme = ref(vuetifyTheme.global.name.value);

function cloneStyle(style: Style): Style {
  return {
    ...style,
    themes: style.themes.map((t: Theme) => ({ ...t })),
  };
}

const style = computed( {
  get: () => {
    if (!active_tab.value)
      return cloneStyle(defaultStyle);
    return active_tab.value.document.style ?? cloneStyle(defaultStyle);
  },
  set: (v) => {
    if (active_tab.value && v) {
      active_tab.value.document.style = cloneStyle(v);
    }
  },
});

const appTheme = computed({
  get: () => vuetifyTheme.global.name.value,
  set: (v: string) => {
    vuetifyTheme.global.name.value = v;
  },
});

function pickEditorThemeForAppTheme(
  appThemeName: string,
  themes: Theme[],
  currentEditorTheme: string,
): string {
  if (themes.length === 0)
    return currentEditorTheme;
  const hasCurrent = themes.some((t) => t.name === currentEditorTheme);
  const lowered = appThemeName.toLowerCase();
  const preferredToken = lowered.includes("dark") ? "dark" : "light";
  const preferred = themes.find((t) => t.name.toLowerCase().includes(preferredToken));
  if (preferred)
    return preferred.name;
  const exact = themes.find((t) => t.name.toLowerCase() === preferredToken);
  if (exact)
    return exact.name;
  if (hasCurrent)
    return currentEditorTheme;
  return themes[0].name;
}

watch(
  () => appTheme.value,
  (themeName) => {
    editorTheme.value = pickEditorThemeForAppTheme(
      themeName,
      style.value.themes,
      editorTheme.value,
    );
  },
  { immediate: true },
);

watch(
  () => style.value.themes.map((t) => t.name),
  () => {
    editorTheme.value = pickEditorThemeForAppTheme(
      appTheme.value,
      style.value.themes,
      editorTheme.value,
    );
  },
);

const tool_tab = ref("properties");
</script>

<style type="text/css">
.v-tab {
  text-transform: none !important;
}
</style>