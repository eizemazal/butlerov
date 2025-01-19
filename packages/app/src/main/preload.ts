import { MolConverter, SmilesConverter } from "butlerov";
import { contextBridge, ipcRenderer } from "electron";



//let editor: MoleculeEditor;


function filename_to_converter(filename: string) {
    const last_dot_idx = filename.lastIndexOf(".");
    const extension = filename.slice(last_dot_idx + 1).toLowerCase();
    let converter = null;
    if (["sdf", "mol"].includes(extension))
        converter = new MolConverter();
    else if (extension == "smi")
        converter = new SmilesConverter();
    return converter;
}

/*
window.addEventListener("DOMContentLoaded", () => {

    const element = document.getElementById("chemical");
    console.log("aaa");

    if (!element)
        throw "Unable to get DOM element";
    editor = MoleculeEditor.from_html_element(element as HTMLDivElement);
    editor.onchange = () => {
        const mw = new MW(editor.graph).compute();
        const mw_elem = document.getElementById("calcd-mw");
        if (mw_elem)
            mw_elem.innerHTML = mw ? `${mw.toFixed(2)}` : "";
        const composition = new Composition(editor.graph).compute_as_html();
        const composition_elem = document.getElementById("calcd-composition");
        if (composition_elem)
            composition_elem.innerHTML = composition ? `Composition: ${composition}` : "";
    };
});*/

//ipcRenderer.on("menu-file-new", () => editor.clear());
ipcRenderer.on("menu-file-open", async () => {
    ipcRenderer.send('electronMessage', 'testing');
    const file_path = await ipcRenderer.invoke("dialog:file_open");
    if (!file_path)
        return;
    const data = await ipcRenderer.invoke("read_file", file_path);
    if (!data)
        return;
    const converter = filename_to_converter(file_path);
    if (!converter) {
        console.log("Unknown file type");
        return;
    }
    //editor.load(data, converter);
});

ipcRenderer.on("menu-file-save-as", async () => {
    const file_path = await ipcRenderer.invoke("dialog:file_save_as");
    if (!file_path)
        return;

    const converter = filename_to_converter(file_path);
    if (!converter) {
        console.log("Unknown file type");
        return;
    }
    //const data = editor.save(converter);
    //await ipcRenderer.invoke("write_file", file_path, data);
});


const api = {
    send: (channel: string, data: any) => {
        let validChannels = ['clientMessage'] // <-- Array of all ipcRenderer Channels used in the client
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },
    //Main (Electron) to Render (Vue)
    on: (channel: string, func: any) => {
        let validChannels = ['electronMessage', 'menu-file-open', 'menu-file-new', 'menu-file-close'] // <-- Array of all ipcMain Channels used in the electron
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    }
};


contextBridge.exposeInMainWorld("electronAPI", api);

export type APIInterface = typeof api;