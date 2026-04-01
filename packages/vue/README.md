# `@butlerov-chemistry/vue`

Vue 3 wrapper around [`@butlerov-chemistry/core`](../core/README.md).

Use it as a full-size chemical editor with:
- native graph binding (`v-model`)
- MOL string binding (`v-model:mol`)
- style/theme customization
- optional computed descriptors (`mw`, `formula`, `formula_html`, `exact_mass`)

---

## Install

```bash
npm i @butlerov-chemistry/vue
```

Peer dependency: `vue` `^3.0.0`.

---

## Simplest Example

```vue
<template>
  <div class="editor">
    <VueButlerov v-model="graph" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";
import type { Graph } from "@butlerov-chemistry/core";

const graph = ref<Graph>({
  type: "Graph",
  vertices: [],
  edges: [],
});
</script>

<style scoped>
.editor {
  height: 420px;
  border: 1px solid #ddd;
}
</style>
```

Give the component container a non-zero height (`height`, flex layout, grid row, etc.).  
`VueButlerov` fills container width/height.

---

## Binding Modes

Use **exactly one** input channel at a time:
- `v-model` (native graph/document)
- `v-model:mol` (MOL string)

### Native model (`v-model`)

```vue
<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";
import type { Graph } from "@butlerov-chemistry/core";

const graph = ref<Graph>({ type: "Graph", vertices: [], edges: [] });
</script>

<template>
  <div class="editor">
    <VueButlerov v-model="graph" />
  </div>
</template>
```

### MOL model (`v-model:mol`)

```vue
<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";

const mol = ref("");
</script>

<template>
  <div class="editor">
    <VueButlerov v-model:mol="mol" />
  </div>
</template>
```

---

## Style, Theme, and Settings

```vue
<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";
import { defaultStyle, type Graph, type Style } from "@butlerov-chemistry/core";

const graph = ref<Graph>({ type: "Graph", vertices: [], edges: [] });
const style = ref<Style>({
  ...defaultStyle,
  atom_font_size_px: 18,
  bond_thickness_px: 2,
  themes: defaultStyle.themes.map(t => ({ ...t })),
});
const theme = ref("dark");
const readonly = ref(false);
</script>

<template>
  <div class="editor">
    <VueButlerov
      v-model="graph"
      :style="style"
      :theme="theme"
      :disabled="readonly"
      :autofocus="true"
      :zoom-fit-padding="0.08"
      :copyable="true"
    />
  </div>
</template>
```

---

## Descriptor API (Lazy + Debounced)

`VueButlerov` can compute descriptors and expose them via `v-model:descriptors`.
Only requested keys are computed.

```vue
<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";
import type { Graph } from "@butlerov-chemistry/core";
import type { VueButlerovDescriptorValues } from "@butlerov-chemistry/vue";

const graph = ref<Graph>({ type: "Graph", vertices: [], edges: [] });
const descriptors = ref<VueButlerovDescriptorValues>({});
</script>

<template>
  <VueButlerov
    v-model="graph"
    :descriptor-keys="['mw', 'formula_html']"
    v-model:descriptors="descriptors"
    :descriptor-debounce-ms="{ mw: 120, formula_html: 40 }"
  />

  <p>MW: {{ typeof descriptors.mw === 'number' ? descriptors.mw.toFixed(2) : '' }}</p>
  <p v-html="descriptors.formula_html || ''"></p>
</template>
```

Supported keys:
- `mw`
- `formula`
- `formula_html`
- `exact_mass`

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | native model | `undefined` | Native input channel (`v-model`). |
| `mol` | `string` | `undefined` | MOL input channel (`v-model:mol`). |
| `mode` | `"structure" \| "scheme"` | `"structure"` | Editor mode. |
| `style` | `Style` | `defaultStyle` | Drawing style object. |
| `theme` | `Theme \| string` | `"light"` | Theme name/object. |
| `copyable` | `boolean` | `true` | Show hover copy button. |
| `disabled` | `boolean` | `false` | Read-only editor. |
| `autofocus` | `boolean` | `true` | Focus stage on mount. |
| `zoomFitPadding` | `number` | `0.05` | Extra zoom-to-fit margin ratio. |
| `descriptorKeys` | descriptor key array | `[]` | Which descriptors to compute. |
| `descriptors` | descriptor map | `{}` | `v-model:descriptors` value. |
| `descriptorDebounceMs` | partial map | `{}` | Optional per-descriptor debounce override. |

---

## Events

| Event | Payload |
|---|---|
| `update:modelValue` | native model |
| `update:mol` | `string` |
| `update:descriptors` | descriptor map |
| `error` | `Error` |

---

## Exposed Instance

`VueButlerov` exposes:
- `editor` (`MoleculeEditor`)

Useful for advanced integration/tests.

---

## Related

- [Core library (`@butlerov-chemistry/core`)](../core/README.md)
- [Desktop app](../app/README.md)
- [Repository README](../../README.md)
