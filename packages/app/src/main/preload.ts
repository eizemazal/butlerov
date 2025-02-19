import { contextBridge, ipcRenderer } from "electron";
import fs from "node:fs";

const api = {
    //-eslint-disable-next-line
    /*send: (channel: string, data: any) => {
        const validChannels = []
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },*/
    //Main (Electron) to Render (Vue)
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: (channel: string, func: any) => {
        const validChannels = ['menu-file-open', 'menu-file-new', 'menu-file-close', 'menu-file-save', 'menu-file-save-as']
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        }
    },
    showOpenDialog: async () => await ipcRenderer.invoke("dialog:file_open"),
    showSaveAsDialog: async () => await ipcRenderer.invoke("dialog:file_save_as"),
    writeFile: (filepath: string, data: string): boolean => {
        try {
            fs.writeFileSync(filepath, data, "utf8");
        }
        catch {
            return false;
        }
        return true;
    },
    readFile: (filepath: string): string => fs.readFileSync(filepath, "utf8"),
};


contextBridge.exposeInMainWorld("electronAPI", api);

export type APIInterface = typeof api;