import { MolConverter, SmilesConverter, NativeConverter, Graph } from "butlerov";
import { contextBridge, ipcRenderer } from "electron";

function filename_to_converter(filename: string) {
    const last_dot_idx = filename.lastIndexOf(".");
    const extension = filename.slice(last_dot_idx + 1).toLowerCase();
    let converter = null;
    if (extension == "json")
        converter = new NativeConverter();
    if (["sdf", "mol"].includes(extension))
        converter = new MolConverter();
    else if (extension == "smi")
        converter = new SmilesConverter();
    return converter;
}

const api = {
    //-eslint-disable-next-line
    /*send: (channel: string, data: any) => {
        const validChannels = []
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },*/
    //Main (Electron) to Render (Vue)
    //eslint-disable-next-line
    on: (channel: string, func: any) => {
        const validChannels = ['menu-file-open', 'menu-file-new', 'menu-file-close', 'menu-file-save', 'menu-file-save-as']
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    },
    showOpenDialog: async () => await ipcRenderer.invoke("dialog:file_open"),
    showSaveAsDialog: async () => await ipcRenderer.invoke("dialog:file_save_as"),
    writeFile: async (path: string, document_json: string): Promise<boolean> => {
        const document = JSON.parse(document_json);
        if (!document.objects?.length)
            return false;
        const converter = filename_to_converter(path);
        if (!converter) {
            console.log("Unknown file type");
            return false;
        }
        let s = undefined;

        //@ts-expect-error ts does not support function|undefined well
        if (typeof converter.document_to_string === "function") {
            //@ts-expect-error ts does not support function|undefined well
            s = converter.document_to_string(document);
        }
        //@ts-expect-error ts does not support function|undefined well
        else if (typeof converter.graph_to_string === "function") {
            const graph: Graph = document.objects[0] as Graph;
            //@ts-expect-error ts does not support function|undefined well
            s = converter.graph_to_string(graph);
        }
        else {
            console.log("Converter for this file type does not support write");
            return false;
        }
        return await ipcRenderer.invoke("write_file", path, s);
    },
    readFile: async (path: string): Promise<string|undefined> => {
        const converter = filename_to_converter(path);
        if (!converter) {
            console.log("Unknown file type");
            return undefined;
        }
        const s = await ipcRenderer.invoke("read_file", path);
        if (!s) {
            console.log("Failed to read file");
            return undefined;
        }
        let doc = undefined;
        //@ts-expect-error ts does not support function|undefined well
        if (typeof converter.document_from_string === "function") {
            //@ts-expect-error ts does not support function|undefined well
            doc = converter.document_from_string(s);
        }
        //@ts-expect-error ts does not support function|undefined well
        else if (typeof converter.graph_from_string === "function") {
            //@ts-expect-error ts does not support function|undefined well
            const graph: Graph = converter.graph_from_string(s)
            doc = {
                mime: "application/butlerov",
                objects: [graph]
            }
        }
        else {
            console.log("Converter for this file type does not support read");
            return undefined;
        }
        return JSON.stringify(doc);
    }
};


contextBridge.exposeInMainWorld("electronAPI", api);

export type APIInterface = typeof api;