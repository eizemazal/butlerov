# `@butlerov-chemistry/core`

Butlerov **core** is the Konva-based chemical structure editor. Use it from **npm** in bundled apps or from a **single script tag** on vanilla HTML pages.

The UMD build exposes the global name **`butlerov`** (see [Build output](#build-output)).

---

## Install

```bash
npm i @butlerov-chemistry/core
```

---

## ES modules (bundlers, `type="module"`)

```javascript
import {
  MoleculeEditor,
  MolConverter,
  SmilesConverter,
  MW,
  Composition,
  defaultStyle,
  lightTheme,
} from "@butlerov-chemistry/core";

const stageEl = document.getElementById("editor");
const mol = new MolConverter();

const editor = new MoleculeEditor({
  stage: stageEl,
  mode: "structure",
  theme: "light",
  style: defaultStyle,
  autofocus: true,
});

editor.onchange = () => {
  const mw = new MW(editor.graph).compute();
  console.log("Molecular weight:", mw != null ? mw.toFixed(2) : "—");
};

// Optional: load / save MOL text
// editor.load(molString, mol);
// const molText = editor.save(mol);
```

`MoleculeEditor` expects a **stage** that is either an `HTMLDivElement` (Konva creates the stage inside it) or an existing Konva `Stage`. You must pass **`mode`**: `"structure"` for molecule editing, or `"scheme"` for document-style canvases.

---

## Vanilla HTML page (UMD script)

After `npm run build` in this package, the browser bundle is:

| File | Role |
|------|------|
| `dist/butlerov.umd.cjs` | UMD bundle, global `butlerov` |
| `dist/butlerov.es.cjs` | ES module |

Copy `dist/butlerov.umd.cjs` into your site (or consume it from npm and serve from `node_modules`), then:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Butlerov</title>
    <script src="./butlerov.umd.cjs"></script>
  </head>
  <body>
    <div id="stage" style="width: 800px; height: 500px; border: 1px solid #ccc"></div>
    <script>
      const editor = new butlerov.MoleculeEditor({
        stage: document.getElementById("stage"),
        mode: "structure",
      });
      editor.onchange = function () {
        const g = editor.graph;
        const mw = new butlerov.MW(g).compute();
        console.log("MW", mw);
      };
    </script>
  </body>
</html>
```

From a CDN (adjust version as needed):

```html
<script src="https://unpkg.com/@butlerov-chemistry/core@latest/dist/butlerov.umd.cjs"></script>
```

---

## Main API (quick reference)

| Member | Purpose |
|--------|---------|
| `new MoleculeEditor({ stage, mode, ... })` | Create editor; `mode` is `"structure"` or `"scheme"`. |
| `editor.graph` / `editor.graph = graph` | Read/write native **`Graph`** model. |
| `editor.document` | Read/write full **`Document`** (scheme mode / multi-object). |
| `editor.load(string, converter)` | Load from MOL/SMILES/etc. via a **`Converter`**. |
| `editor.save(converter)` | Serialize with **`MolConverter`**, **`SmilesConverter`**, etc. |
| `editor.onchange` | Callback after edits. |
| `editor.readonly` | When `true`, view-only (no editing). |
| `editor.clear(fromUserspace?)` | Clear canvas. |
| `new MW(graph).compute()` | Molecular weight. |
| `new Composition(graph).compute_as_html()` | Composition HTML. |
| `new MolConverter()` / `new SmilesConverter()` | MOL V2000/V3000 and SMILES interop where implemented. |

For themes and styling, import `defaultStyle`, `lightTheme`, `darkTheme`, and pass `theme` / `style` in the constructor or assign `editor.theme` / `editor.style` after creation.

---

## Development server (this package)

```bash
npm run dev
```

Vite dev server with HMR (default `http://localhost:5173/`).

---

## Repository layout

Monorepo root: [README.md](../../README.md). Related packages: [Vue component](../vue/README.md), [desktop app](../app/README.md).
