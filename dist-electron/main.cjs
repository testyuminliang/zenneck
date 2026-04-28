"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, Tray, Menu, nativeImage, screen } = require("electron");
const path_1 = require("path");
let win = null;
let tray = null;
const isDev = process.env.NODE_ENV === "development";
function createWindow() {
    win = new BrowserWindow({
        width: 400,
        height: 600,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: {
            preload: (0, path_1.join)(__dirname, "preload.cjs"),
            contextIsolation: true,
        },
    });
    const display = screen.getPrimaryDisplay();
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
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip("Zenneck");
    const menu = Menu.buildFromTemplate([
        { label: "显示", click: () => win?.show() }, // eslint-disable-line
        { label: "隐藏", click: () => win?.hide() }, // eslint-disable-line
        { type: "separator" },
        { label: "退出", click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
}
app.whenReady().then(() => {
    createWindow();
    createTray();
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
