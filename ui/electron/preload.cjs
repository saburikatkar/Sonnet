const { contextBridge } = require('electron')

// Only expose read-only version info for now. No filesystem or IPC yet.
contextBridge.exposeInMainWorld('synora', {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})
