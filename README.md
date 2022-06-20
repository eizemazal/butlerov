Butlerov - a free and open source chemical structure editor written in Typescript and based on Konva.js.

For now, it is meant to be used to edit files in Mol format, because I need this badly. Other formats and SMILES might be supported later, as well as more advanced chemical drawing of multiple fragments and chemical artwork.

The package is named after Alexander M. Butlerov (1828-1886), a Russian chemist who proposed the idea that order of atom connection matters for oragnic compounds, so basically introduced chemical structures.

### Installation and use

git clone
npm run dev or npm run build to build dev or production version of the js lib bundle

There is an example in demo folder that is available after build.

### Installation

git clone ...
npm i
npm run build

Open demo/test.html in browser, and see how it works. Use mouse and keyboard for drawing. The context menu (inspired by Blender 3D editor software) is invoked by space bar when the mouse is over a bond or atom. The hot keys are specified in the menu.

### License

MIT license for the use in both commercial and non-commercial projects.
