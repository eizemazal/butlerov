Butlerov - a free and open source chemical structure editor written in Typescript and based on Konva.js.

For now, it is meant to be used to edit files in Mol format, because I need this badly. Other formats and SMILES might be supported later, as well as more advanced chemical drawing of multiple fragments and chemical artwork.

The package is named after Alexander M. Butlerov (1828-1886), a Russian chemist who proposed the idea that order of atom connection matters for organic compounds, so basically introduced chemical structures.

---
## Demo and current features

A demo of the current version is available at Codepen:
https://codepen.io/eizemazal/pen/ExQzmoJ

Use both your mouse and your keyboard for fast drawing. The context menu (inspired by Blender 3D editor software) is invoked by space bar when the mouse is over a bond or atom. The hot keys are specified in the menu.

---

## Installation and use

Install into your project via npm

```bash
npm i butlerov
```

Or include it in your `index.html` file
```html
<script src="https://unpkg.com/butlerov/dist/butlerov.js"></script>
```

Use it in your script files:

```javascript

import { MoleculeEditor } from "butlerov";
// or use window.butlerov.MoleculeEditor global object

// bind editor to div element
const element = document.getElementById("div-element");
const editor = MoleculeEditor.from_html_element(element);

// load molfile format from string mol_string
editor.load_from_mol_string(mol_string);

// attach handler to 'onchange' event, and get the mol string from the editor
editor.onchange = function() { console.log(editor.get_mol_string()); }

```

---

## Local build / contribs

Clone, build from source and test locally:

```bash
git clone git@github.com:eizemazal/butlerov.git
cd butlerov
npm i
npm run build
firefox demo/test.html
```

Open `demo/test.html` in browser, and see how it works.

Run tests:

```bash
npm run test
```

Automated tests require node-canvas package that is dependent on many graphic libs installed on your system. If it does not work out of the box, follow instructions for your platform here: https://github.com/Automattic/node-canvas. For example, for MacOS, the following dependencies are to be installed:

```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

(For Mac M1, I had to switch to node `v.14.19` to run tests, because node and libs must be built with the same architecture).

The project uses eslint.
I am developing using VS code and eslint plugin. Contributions are highly welcome.


## ToDo - smaller tasks
- implement support for isotope specification
- add support for radicals
- sometimes cycles are created over existing atoms - fix it
- when creating an edge by dragging between existing vertices, display it
- when edge order is changed (e.g. from 1 to 3), move substituents to fit geometry
- add support for abbreviations and superatoms
- improve display of charges to show them top right when possible and not adjacent to a double edge
- add support for coloring schemes for atoms
- support for selection, copy and paste

## ToDo - larger tasks
- Add support for SMILES reading and writing. Structures after inserting SMILES should look well.
- Write support for mobile platforms to use taps for drawing on Android and iOS devices
- Implement scheme drawing tool based on Butlerov. It should retain its lightweight functionality to draw and display structures. Add support for drawing primitives (arrows, text etc), and support for multiple structures.
- write support for cdx export and import, and svg export

---

## License

Butlerov is developed for the use in cheminformatics projects by Lumiprobe Group.
Brought to public domain under MIT license for the use in both commercial and non-commercial projects.
