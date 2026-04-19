// CommonJS preload — contextBridge API exposed to the renderer.
const { contextBridge, ipcRenderer } = require('electron');

const api = {
  env: {
    isElectron: true,
    platform: process.platform,
    version: () => ipcRenderer.invoke('app:version'),
    userDataPath: () => ipcRenderer.invoke('app:userDataPath'),
  },
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.send('app:minimize'),
    toggleFullscreen: () => ipcRenderer.send('app:toggleFullscreen'),
  },
  saves: {
    load:   (slot) => ipcRenderer.invoke('saves:load', slot),
    save:   (slot, data) => ipcRenderer.invoke('saves:save', slot, data),
    list:   () => ipcRenderer.invoke('saves:list'),
    delete: (slot) => ipcRenderer.invoke('saves:delete', slot),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (data) => ipcRenderer.invoke('settings:save', data),
  },
  steam: {
    isRunning:           () => ipcRenderer.invoke('steam:isRunning'),
    activateAchievement: (id) => ipcRenderer.invoke('steam:activateAchievement', id),
    setRichPresence:     (k, v) => ipcRenderer.invoke('steam:setRichPresence', k, v),
    clearRichPresence:   () => ipcRenderer.invoke('steam:clearRichPresence'),
    appId:               () => ipcRenderer.invoke('steam:appId'),
  },
  dialog: {
    showMessage: (options) => ipcRenderer.invoke('dialog:showMessage', options),
  },
};

contextBridge.exposeInMainWorld('abyss', api);
