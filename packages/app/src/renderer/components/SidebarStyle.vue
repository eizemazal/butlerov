<template>
  <v-list class="settings-list">
    <v-list-subheader>Display settings</v-list-subheader>

    <v-list-item>
      <v-select
        v-model="appThemeModel"
        label="App theme"
        :items="themeItems"
        item-title="title"
        item-value="value"
        variant="underlined"
      />
    </v-list-item>

    <v-list-item>
      <v-select
        v-model="editorThemeModel"
        label="Editor theme preset"
        :items="editorThemeItems"
        item-title="title"
        item-value="value"
        variant="underlined"
      />
    </v-list-item>

    <v-list-subheader>Theme properties</v-list-subheader>
    <v-list-item
      v-for="field in themeFieldKeys"
      :key="`theme-${field}`"
      class="setting-row"
    >
      <v-switch
        v-if="themeFieldIsBoolean(field)"
        :label="humanize(field)"
        :model-value="Boolean(themeFieldValue(field))"
        color="primary"
        hide-details
        @update:model-value="setThemeField(field, Boolean($event))"
      />
      <v-text-field
        v-else
        :label="humanize(field)"
        :type="themeFieldIsNumber(field) ? 'number' : 'text'"
        :step="themeFieldIsNumber(field) ? 'any' : undefined"
        :model-value="String(themeFieldValue(field) ?? '')"
        variant="underlined"
        hide-details
        @update:model-value="setThemeField(field, String($event ?? ''))"
      />
    </v-list-item>

    <v-list-subheader>Style properties</v-list-subheader>
    <v-list-item
      v-for="field in styleFieldKeys"
      :key="`style-${field}`"
      class="setting-row"
    >
      <v-switch
        v-if="styleFieldIsBoolean(field)"
        :label="humanize(field)"
        :model-value="Boolean(styleFieldValue(field))"
        color="primary"
        hide-details
        @update:model-value="setStyleField(field, Boolean($event))"
      />
      <v-text-field
        v-else
        :label="humanize(field)"
        :type="styleFieldIsNumber(field) ? 'number' : 'text'"
        :step="styleFieldIsNumber(field) ? 'any' : undefined"
        :model-value="String(styleFieldValue(field) ?? '')"
        variant="underlined"
        hide-details
        @update:model-value="setStyleField(field, String($event ?? ''))"
      />
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Style, Theme } from "@butlerov-chemistry/core";

const styleModel = defineModel<Style>({ required: true });
const appThemeModel = defineModel<string>("appTheme", { required: true });
const editorThemeModel = defineModel<string>("editorTheme", { required: true });

const themeItems = [
  { title: "light", value: "light" },
  { title: "dark", value: "dark" },
];

const editorThemeItems = computed(() =>
  styleModel.value.themes.map((theme: Theme) => ({
    title: theme.name,
    value: theme.name,
  })),
);

const activeTheme = computed(
  () =>
    styleModel.value.themes.find((t: Theme) => t.name === editorThemeModel.value)
    || styleModel.value.themes[0],
);

const styleFieldKeys = computed(
  () => Object.keys(styleModel.value).filter((k) => !["name", "themes"].includes(k)),
);

const themeFieldKeys = computed(
  () => Object.keys(activeTheme.value ?? {}).filter((k) => k !== "name"),
);

function humanize(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}

function styleFieldValue(field: string): unknown {
  return (styleModel.value as Record<string, unknown>)[field];
}

function styleFieldIsBoolean(field: string): boolean {
  return typeof styleFieldValue(field) === "boolean";
}

function styleFieldIsNumber(field: string): boolean {
  return typeof styleFieldValue(field) === "number";
}

function themeFieldValue(field: string): unknown {
  return ((activeTheme.value ?? {}) as Record<string, unknown>)[field];
}

function themeFieldIsBoolean(field: string): boolean {
  return typeof themeFieldValue(field) === "boolean";
}

function themeFieldIsNumber(field: string): boolean {
  return typeof themeFieldValue(field) === "number";
}

function setStyleField(field: string, rawValue: string | boolean) {
  const current = styleFieldValue(field);
  let value: unknown = rawValue;
  if (typeof current === "number") {
    const parsed = parseFloat(`${rawValue}`);
    if (Number.isNaN(parsed))
      return;
    value = parsed;
  }
  styleModel.value = {
    ...styleModel.value,
    themes: styleModel.value.themes.map((t: Theme) => ({ ...t })),
    [field]: value,
  };
}

function setThemeField(field: string, rawValue: string | boolean) {
  const selected = activeTheme.value;
  if (!selected)
    return;
  const current = (selected as Record<string, unknown>)[field];
  let value: unknown = rawValue;
  if (typeof current === "number") {
    const parsed = parseFloat(`${rawValue}`);
    if (Number.isNaN(parsed))
      return;
    value = parsed;
  }
  styleModel.value = {
    ...styleModel.value,
    themes: styleModel.value.themes.map((theme: Theme) => (
      theme.name === selected.name ? { ...theme, [field]: value } : { ...theme }
    )),
  };
}
</script>

<style scoped>
.settings-list {
  padding-bottom: 12px;
}

.setting-row {
  align-items: flex-start;
  min-height: 76px;
}

.setting-row :deep(.v-list-item__content) {
  width: 100%;
  overflow: visible;
}

.setting-row :deep(.v-input) {
  width: 100%;
}
</style>