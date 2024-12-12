import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain, session } from "electron";
import path from "path";
import fs from "node:fs";

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(app.getAppPath(), "preload.js"),
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

    mainWindow.webContents.openDevTools();

    const menu_template: MenuItemConstructorOptions[] = [
        {
            label: "File",
            submenu: [
                { label: "New", "accelerator": "CommandOrControl+N", click: () => { mainWindow.webContents.send("menu-file-new"); } },
                { label: "Open...", "accelerator": "CommandOrControl+O", click: () => { mainWindow.webContents.send("menu-file-open"); } },
                //{label: "Save", "accelerator": "CommandOrControl+S", },
                { label: "Save as...", "accelerator": "CommandOrControl+Shift+S", click: () => { mainWindow.webContents.send("menu-file-save-as"); } },
                //{label: "Overwrite", toolTip: "Export back in the same format" },
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
    ipcMain.handle("dialog:file_open", handle_file_open);
    ipcMain.handle("read_file", (evt, filename) => handle_read_file(filename));
    ipcMain.handle("dialog:file_save_as", handle_file_save_as);
    ipcMain.handle("write_file", (evt, filename, data) => handle_write_file(filename, data));
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("message", (event, message) => {
    console.log(message);
});

const file_filters = [
    { name: "Molfiles (*.mol, *.sdf)", extensions: ["mol", "sdf"] },
    { name: "SMILES (*.smi)", extensions: ["smi"] },
];

async function handle_file_open() {
    return dialog.showOpenDialog({
        properties: ["openFile"],
        filters: file_filters
    }).then(res => {
        if (!res.canceled)
            return res.filePaths[0];
    });
}

async function handle_read_file(filepath: string) {
    return fs.readFileSync(filepath, "utf8");
}

async function handle_file_save_as() {
    return dialog.showSaveDialog({
        properties: ["showOverwriteConfirmation", "createDirectory"],
        filters: file_filters
    }).then(res => {
        if (!res.canceled)
            return res.filePath;
    });
}

async function handle_write_file(filepath: string, data: string) {
    return fs.writeFileSync(filepath, data, "utf8");
}