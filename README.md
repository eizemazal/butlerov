Butlerov - a free and open source chemical structure editor written in Typescript and based on Konva.js.

For now, it is meant to be used to edit files in Mol format, because I need this badly. Other formats and SMILES might be supported later, as well as more advanced chemical drawing of multiple fragments and chemical artwork.

The package is named after Alexander M. Butlerov (1828-1886), a Russian chemist who proposed the idea that order of atom connection matters for organic compounds, so basically introduced chemical structures.

### Demo and current features

A demo of the current version is available at Codepen:
https://codepen.io/au1985/pen/ExQzmoJ

Use both your mouse and your keyboard for fast drawing. The context menu (inspired by Blender 3D editor software) is invoked by space bar when the mouse is over a bond or atom. The hot keys are specified in the menu.

### Installation and use

    npm i butlerov
    // or <script src="https://unpkg.com/butlerov/dist/butlerov.js"></script>

    import { MoleculeEditor } from "butlerov";
    // or use window.butlerov.MoleculeEditor global object

    // bind editor to div element
    const element = document.getElementById("div-element");
    const editor = MoleculeEditor.from_html_element(element);

    // load molfile format from string mol_string
    editor.load_from_mol_string(mol_string);

    // attach handler to onchange event, and get the mol string from the editor
    editor.onchange = function() { console.log(editor.get_mol_string()); }

### Local build / contribs

    git clone git@github.com:au1985/butlerov.git
    cd butlerov
    npm i
    npm run build
    firefox demo/test.html

Open demo/test.html in browser, and see how it works.
The project uses eslint. I am developing using VS code and eslint plugin. Contributions are highly welcome.

### License

Butlerov is developed for the use in cheminformatics projects by Lumiprobe Group.
Brought to public domain under MIT license for the use in both commercial and non-commercial projects.
