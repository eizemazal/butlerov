import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, session } from "electron";
import path from "path";
import { env } from "node:process";

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.resolve(app.getAppPath(), app.isPackaged ? "main/preload.js" : "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        }
    });

    if (process.env.NODE_ENV === "development") {
        const rendererPort = process.argv[2];
        mainWindow.loadURL(`http://localhost:${rendererPort}`);
    }
    else {
        mainWindow.loadFile(path.join(app.getAppPath(), "renderer", "index.html"));
    }

    if (env.IS_DEBUG)
        mainWindow.webContents.openDevTools();

    const menu_template: MenuItemConstructorOptions[] = [
        {
            label: "File",
            submenu: [
                { label: "New", "accelerator": "CommandOrControl+N", click: () => { mainWindow.webContents.send("menu-file-new"); } },
                { label: "Open...", "accelerator": "CommandOrControl+O", click: () => { mainWindow.webContents.send("menu-file-open"); } },
                { label: "Save", "accelerator": "CommandOrControl+S", click: () => { mainWindow.webContents.send("menu-file-save"); } },
                { label: "Save as...", "accelerator": "CommandOrControl+Shift+S", click: () => { mainWindow.webContents.send("menu-file-save-as"); } },
                { label: "Close", "accelerator": "CommandOrControl+W", click: () => { mainWindow.webContents.send('menu-file-close'); } },
                { label: "Export...", toolTip: "Export back in the same format", click: () => { mainWindow.webContents.send('menu-file-export-as'); } },
                process.platform === "darwin" ? { role: "close" } : { role: "quit" }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menu_template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": ["script-src 'self'"]
            }
        });
    });

    app.on("activate", function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    ipcMain.handle("dialog:file_open", show_open_dialog);
    ipcMain.handle("dialog:file_save_as", show_save_dialog);
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

const file_filters = [
    { name: "Butlerov JSON (*.json)", extensions: ["json"] },
    { name: "Molfiles (*.mol, *.sdf)", extensions: ["mol", "sdf"] },
    { name: "SMILES (*.smi)", extensions: ["smi"] },
];

async function show_open_dialog() {
    const all_extensions = { name: "All supported files", extensions: file_filters.reduce((a, b) => a.concat(b.extensions), [] as string[]) };
    const filters_with_all = [all_extensions, ...file_filters]
    return dialog.showOpenDialog({
        properties: ["openFile"],
        filters: filters_with_all,
    }).then(res => {
        if (!res.canceled)
            return res.filePaths[0];
    });
}

async function show_save_dialog() {
    return dialog.showSaveDialog({
        properties: ["showOverwriteConfirmation", "createDirectory"],
        filters: file_filters
    }).then(res => {
        if (!res.canceled)
            return res.filePath;
    });
}


