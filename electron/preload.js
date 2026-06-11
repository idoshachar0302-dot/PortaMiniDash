const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onSpotifyAuthCode: (callback) => {
    ipcRenderer.on('spotify-auth-code', (_event, data) => callback(data));
  },
});
