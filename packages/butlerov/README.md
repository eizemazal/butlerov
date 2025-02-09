Butlerov core web component - a control to edit and display chemical structures.


## Use in frontend projects

When using in projects built by js package managers like npm / yarn, just install into your project:

```bash
npm i butlerov
```

Then, import

```javascript
import { MoleculeEditor, MW } from "butlerov";
const editor = MoleculeEditor({stage: document.getElementById("div-chemical")});
editor.onchange = () => {
    const mw = new MW(editor.graph).compute();
    console.log(`Molecular weight: ${MW} Da`);
}
```

## Use in browser

You need to put `butlerov.umd.js` universal module definition (UMD) file somewhere in your project tree.

```html
<html>
    <head>
        <script type="text/javascript" src="/js/butlerov.umd.js"></script>
        <!-- alternative option: -->
        <!-- <script src="https://unpkg.com/butlerov/dist/butlerov.umd.js"></script> -->
        <script type="text/javascript">
            const editor = window.butlerov.MoleculeEditor({stage: document.getElementById("div-chemical")});
            editor.onchange = () => {
                const mw = new window.butlerov.MW(editor.graph).compute();
                console.log(`Molecular weight: ${MW} Da`);
            }
        </script>
    </head>
    <body>
        <p>Now draw some chemistry</p>
        <div style="width: 1000px; height: 600px" id="div-chemical"></div>
    </body>
</html>
```
