Butlerov - a free and open source chemical structure editor written in Typescript and based on Konva.js.

Currently it supports editing single chemical structure, but is going to be converted to a full blown piece of software for 2D scheme editing.

The interface approach is a bit different from other editors (ChemDraw, MarvinSketch, ChemWindow, IsisDraw etc), its concept of UI is taken from Blender 3D. Keyboard, mouse and context menu are used to draw chemical structures quickly. Also, the options to "pull and drag" chemical bonds are strongly minimized by design in favor of algorithms giving clean and symmetrical substituent positioning. This may require some adaptation that is meant to pay off (especially when using component for chemical databases - fixing ugly structures drawn by others can be daunting).

The package is named after Alexander M. Butlerov (1828-1886), a Russian chemist who proposed the idea that order of atom connection matters for organic compounds, so basically introduced chemical structures.

## Current features

- Read / write .mol (.sdf) files
- draw chemical structures, add chains, rings, condensed systems
- single, multiple bonds
- charges
- isotopes
- unlimited undo/redo
- symmetry tools for the drawing
- superatoms / abbreviations (like CO2H, TMS)
- compute brutto formula, exact and molecular weight


---
## Demo

A demo of the current version is available at Codepen:
https://codepen.io/eizemazal/pen/ExQzmoJ

Use both your mouse and your keyboard for fast drawing. The context menu is invoked by space bar when the mouse is over a bond or atom. The hot keys are specified in the menu.


## Butlerov app

The app is written in Electron and is going to be available on different platforms (Linux, MacOS and Windows).

Source code is [here](packages/app/README.md).


## Butlerov web component

Web component can be embedded into web applications, see [here](packages/butlerov/README.md).


---

## Developing Butlerov

If you would like to participate, you are welcome.

Butlerov is a monorepo with workspaces.

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
