const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  walkStart:         (dx) => ipcRenderer.send('walk-start', dx),
  walkStop:          ()   => ipcRenderer.send('walk-stop'),
  setWindowSize:     (w, h) => ipcRenderer.send('set-window-size', w, h),
  closeWindow:       ()   => ipcRenderer.send('close-window'),
  minimizeWindow:    ()   => ipcRenderer.send('minimize-window'),
  maximizeWindow:    ()   => ipcRenderer.send('maximize-window'),
  petDragStart:      (offset) => ipcRenderer.send('pet-drag-start', offset),
  petDragStop:       ()   => ipcRenderer.send('pet-drag-stop'),
  getStore:          ()   => ipcRenderer.invoke('get-store'),
  setStore:          (k,v)=> ipcRenderer.send('set-store', k, v),
  onDirectionChange: (cb) => {
    ipcRenderer.on('walk-direction', (_event, dx) => cb(dx))
  },
  removeDirectionListener: () => {
    ipcRenderer.removeAllListeners('walk-direction')
  },
  getPets: () => ipcRenderer.invoke('get-pets')
})
