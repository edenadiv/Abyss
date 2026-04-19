import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { initStore, type Store } from './store.js';
import { steam } from './steam.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:5180';

// Apple Silicon's Metal compositor wants a clean launch — no Vulkan flags,
// no Skia renderer overrides, no ignore-gpu-blocklist.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// WebGPU is the target renderer — enabled unconditionally.
app.commandLine.appendSwitch('enable-unsafe-webgpu');
app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');

app.setName('Abyss');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let mainWindow: BrowserWindow | null = null;
let store: Store | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#050308',
    show: false,
    autoHideMenuBar: true,
    title: 'Abyss',
    icon: path.join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webgl: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev && process.env.ABYSS_DEVTOOLS === '1') {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // F12 to toggle devtools on demand.
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') mainWindow?.webContents.toggleDevTools();
  });

  if (isDev) mainWindow.loadURL(DEV_URL);
  else       mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  store = await initStore();
  steam.init();
  writeSteamAppId();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { steam.shutdown(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { steam.shutdown(); });

function writeSteamAppId() {
  try {
    const userData = app.getPath('userData');
    const target = path.join(userData, 'steam_appid.txt');
    if (!fs.existsSync(target)) {
      const bundled = path.join((process as any).resourcesPath || __dirname, 'steam_appid.txt');
      if (fs.existsSync(bundled)) fs.copyFileSync(bundled, target);
      else fs.writeFileSync(target, '480\n', 'utf8');
    }
  } catch {}
}

// --- IPC ---
ipcMain.handle('saves:load',    (_e, slot: number) => store!.loadSave(slot));
ipcMain.handle('saves:save',    (_e, slot: number, data: any) => store!.writeSave(slot, data));
ipcMain.handle('saves:list',    () => store!.listSaves());
ipcMain.handle('saves:delete',  (_e, slot: number) => store!.deleteSave(slot));
ipcMain.handle('settings:load', () => store!.loadSettings());
ipcMain.handle('settings:save', (_e, data: any) => store!.writeSettings(data));
ipcMain.handle('app:version',   () => app.getVersion());
ipcMain.handle('app:quit',      () => { app.quit(); });
ipcMain.on('app:minimize',      (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on('app:toggleFullscreen', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});
ipcMain.handle('app:userDataPath', () => app.getPath('userData'));
ipcMain.handle('steam:isRunning',           () => steam.isRunning());
ipcMain.handle('steam:activateAchievement', (_e, id: string) => steam.activateAchievement(id));
ipcMain.handle('steam:setRichPresence',     (_e, k: string, v: string) => steam.setRichPresence(k, v));
ipcMain.handle('steam:clearRichPresence',   () => steam.clearRichPresence());
ipcMain.handle('steam:appId',               () => steam.appId());
ipcMain.handle('dialog:showMessage',        async (e, options) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
});
