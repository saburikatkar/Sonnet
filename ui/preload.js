const { contextBridge, ipcRenderer } = require('electron');

// PRE-PRODUCTION SECURITY AUDIT U2: Expose only necessary IPC channels.
// Using contextBridge to prevent arbitrary code execution from renderer process.
const validInvokeChannels = ['get-app-version'];
const validSendChannels = [];
const validReceiveChannels = [];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Unauthorized IPC Invoke Channel: ${channel}`);
  },
  send: (channel, ...args) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      throw new Error(`Unauthorized IPC Send Channel: ${channel}`);
    }
  },
  on: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      // Strip event object for security and pass only arguments
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    throw new Error(`Unauthorized IPC Receive Channel: ${channel}`);
  }
});
