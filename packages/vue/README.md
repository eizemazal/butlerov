# `@butlerov-chemistry/vue`

Vue **3** wrapper around [`@butlerov-chemistry/core`](../core/README.md): a full-size editor with optional **copy-to-clipboard**, **`v-model`**, and format switching (native graph, MOL, SMILES).

---

## Install

```bash
npm i @butlerov-chemistry/vue
```

Peer dependency: **`vue` ^3.0.0**.

---

## Basic usage

```vue
<template>
  <div style="height: 420px">
    <VueButlerov v-model="structure" format="mol" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";

const structure = ref("");
</script>
```

Give the wrapper a **non-zero height** (for example a fixed `height` or flex layout); the component stretches to `width: 100%` and `height: 100%` of its container.

---

## `v-model`

- **Binding:** `v-model` (or `:model-value` + `@update:modelValue`) holds the current structure or document.
- **Structure mode (`mode="structure"`):**
  - **`format="native"`** (default): model is a **`Graph`** object (`{ type: "Graph", vertices, edges, ... }`).
  - **`format="mol"`** or **`format="smiles"`**: model is a **string** in that format.
- **Scheme mode (`mode="scheme"`):** model is a **document** object (native) or a string if you add string-based document converters in the future; for native scheme documents the payload matches core’s document shape (`objects`, etc.).

The component avoids feedback loops by comparing serialized values when applying external `modelValue` updates.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `VueButlerovModel` | empty structure / document | Current structure or document (see `v-model` above). |
| `format` | `"native"` \| `"mol"` \| `"smiles"` | `"native"` | Serialization format for `v-model`. |
| `mode` | `"structure"` \| `"scheme"` | `"structure"` | Structure vs scheme canvas. |
| `style` | `Style` | `defaultStyle` from core | Drawing style object. |
| `theme` | `Theme` \| `string` | `"light"` | Theme name or object. |
| `copyable` | `boolean` | `true` | Show hover **copy** control (structure mode; copies MOL/SMILES/JSON depending on `format`). |
| `disabled` | `boolean` | `false` | Read-only; maps to core `readonly`. |
| `autofocus` | `boolean` | `true` | Focus the stage on mount for keyboard shortcuts. |
| `zoomFitPadding` | `number` | `0.05` | Extra margin for zoom-to-fit (fraction of stage size). |

---

## Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | same as `v-model` | Structure or document changed in the editor. |

---

## Exposed instance

The component **`defineExpose`s** `{ editor }` — the underlying **`MoleculeEditor`** from core — for advanced use (imperative APIs, testing).

---

## Example: MOL string in a form

```vue
<template>
  <form @submit.prevent="submit">
    <label>MOL</label>
    <textarea v-model="molText" rows="6" readonly />
    <div class="editor">
      <VueButlerov v-model="molText" format="mol" :disabled="previewOnly" />
    </div>
    <button type="submit">Save</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import VueButlerov from "@butlerov-chemistry/vue";

const molText = ref("");
const previewOnly = ref(false);

function submit() {
  console.log(molText.value);
}
</script>

<style scoped>
.editor {
  height: 400px;
  border: 1px solid #ddd;
}
</style>
```

---

## Related

- [Core library (`@butlerov-chemistry/core`)](../core/README.md) — vanilla JS and full API.
- [Desktop app](../app/README.md) — Electron shell.
- [Repository README](../../README.md) — overview and CodePen demo.
