// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app, BrowserWindow, Tray, Menu, nativeImage, screen, globalShortcut } = require("electron");
import { join } from "path";

let win: InstanceType<typeof import("electron").BrowserWindow> | null = null;
let tray: InstanceType<typeof import("electron").Tray> | null = null;
let isCompanionMode = true; // 小窗精灵模式

const isDev = process.env.NODE_ENV === "development";

const COMPANION = { width: 400, height: 600 };

function applyCompanionMode() {
  if (!win) return;
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  win.setResizable(false);
  win.setAlwaysOnTop(true);
  win.setSkipTaskbar(true);
  win.setSize(COMPANION.width, COMPANION.height);
  win.setPosition(width - COMPANION.width - 20, height - COMPANION.height - 20);
  if (!isDev) {
    win.setWindowButtonVisibility?.(false);
  }
}

function applyFullscreenMode() {
  if (!win) return;
  win.setResizable(true);
  win.setAlwaysOnTop(false);
  win.setSkipTaskbar(false);
  win.setFullScreen(true);
  if (!isDev) {
    win.setWindowButtonVisibility?.(true);
  }
}

function toggleMode() {
  isCompanionMode = !isCompanionMode;
  if (isCompanionMode) {
    win?.setFullScreen(false);
    applyCompanionMode();
  } else {
    applyFullscreenMode();
  }
  updateTrayMenu();
}

function updateTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: isCompanionMode ? "切换全屏" : "切换小窗",
      click: toggleMode,
    },
    { type: "separator" },
    { label: "显示", click: () => win?.show() },
    { label: "隐藏", click: () => win?.hide() },
    { type: "separator" },
    { label: "退出", click: () => app.quit() },
  ]);
  tray!.setContextMenu(menu);
}

function createWindow() {
  win = new BrowserWindow({
    width: COMPANION.width,
    height: COMPANION.height,
    transparent: true,
    roundedCorners: true,
    frame: isDev,
    alwaysOnTop: !isDev,
    resizable: isDev,
    skipTaskbar: !isDev,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  if (!isDev) {
    applyCompanionMode();
  }

  if (isDev) {
    win!.loadURL("http://localhost:5173");
    win!.webContents.openDevTools({ mode: "detach" });
  } else {
    win!.loadFile(join(__dirname, "../dist/index.html"));
  }
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray!.setToolTip("Zenneck");
  updateTrayMenu();
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // 快捷键 Cmd+Shift+F 切换模式
  globalShortcut.register("CommandOrControl+Shift+F", toggleMode);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
