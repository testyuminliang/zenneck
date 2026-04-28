"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
let win = null;
let tray = null;
const isDev = process.env.NODE_ENV === "development";
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 400,
        height: 600,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            preload: (0, path_1.join)(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });
    const display = electron_1.screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;
    win.setPosition(width - 420, height - 620);
    if (isDev) {
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools({ mode: "detach" });
    }
    else {
        win.loadFile((0, path_1.join)(__dirname, "../dist/index.html"));
    }
}
function createTray() {
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    tray.setToolTip("Zenneck");
    const menu = electron_1.Menu.buildFromTemplate([
        { label: "显示", click: () => win?.show() },
        { label: "隐藏", click: () => win?.hide() },
        { type: "separator" },
        { label: "退出", click: () => electron_1.app.quit() },
    ]);
    tray.setContextMenu(menu);
}
electron_1.app.whenReady().then(() => {
    createWindow();
    createTray();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
