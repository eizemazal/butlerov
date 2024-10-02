import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain } from "electron";
import * as path from "path";
import fs from "node:fs";

const isMac = process.platform === "darwin";
let win: BrowserWindow;


const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            sandbox: false,
        }
    });

    win.loadFile("../index.html");
    //win.webContents.openDevTools();

    const menu_template : MenuItemConstructorOptions[] = [
        {
            label: "File",
            submenu: [
                {label: "New", "accelerator": "CommandOrControl+N", click: () => { win.webContents.send("menu-file-new");}},
                {label: "Open...", "accelerator": "CommandOrControl+O", click: () => { win.webContents.send("menu-file-open");} },
                //{label: "Save", "accelerator": "CommandOrControl+S", },
                {label: "Save as...", "accelerator": "CommandOrControl+Shift+S", click: () => { win.webContents.send("menu-file-save-as");} },
                //{label: "Overwrite", toolTip: "Export back in the same format" },
                isMac ? { role: "close" } : { role: "quit" }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menu_template);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
    ipcMain.handle("dialog:file_open", handle_file_open);
    ipcMain.handle("read_file", (evt, filename) => handle_read_file(filename));
    ipcMain.handle("dialog:file_save_as", handle_file_save_as);
    ipcMain.handle("write_file", (evt, filename, data) => handle_write_file(filename, data));
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});


const file_filters = [
    { name: "Molfiles (*.mol, *.sdf)", extensions: ["mol", "sdf"] },
    { name: "SMILES (*.smi)", extensions: ["smi"] },
];

async function handle_file_open () {
    return dialog.showOpenDialog({
        properties: ["openFile"],
        filters: file_filters
    }).then(res => {
        if (!res.canceled)
            return res.filePaths[0];
    });
}

async function handle_read_file (filepath: string) {
    return fs.readFileSync(filepath, "utf8");
}

async function handle_file_save_as () {
    return dialog.showSaveDialog({
        properties: ["showOverwriteConfirmation", "createDirectory"],
        filters: file_filters
    }).then(res => {
        if (!res.canceled)
            return res.filePath;
    });
}

async function handle_write_file (filepath: string, data: string) {
    return fs.writeFileSync(filepath, data, "utf8");
}
