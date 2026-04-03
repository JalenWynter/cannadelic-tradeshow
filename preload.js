const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // JSON DB operations
  jsonQuery: (collection, filter, limit) => ipcRenderer.invoke('json-db-query', { collection, filter, limit }),
  jsonRun: (collection, action, payload, filter, uniqueCheck) => ipcRenderer.invoke('json-db-run', { collection, action, payload, filter, uniqueCheck }),
  jsonGet: (collection, filter) => ipcRenderer.invoke('json-db-get', { collection, filter }),
  logStaffAction: (logEntry) => ipcRenderer.invoke('log-staff-action', logEntry),
  wipeAllData: () => ipcRenderer.invoke('wipe-all-data'),
  removeRaffleEntry: (contactId) => ipcRenderer.invoke('remove-raffle-entry', { contactId }),
  getKioskId: () => ipcRenderer.invoke('get-kiosk-id'),
  toggleKiosk: () => ipcRenderer.invoke('toggle-kiosk'),
  getKioskStatus: () => ipcRenderer.invoke('get-kiosk-status'),
  getLastBackupTime: () => ipcRenderer.invoke('get-last-backup-time'),
  getNextBackupTime: () => ipcRenderer.invoke('get-next-backup-time'),
  getBackupSize: () => ipcRenderer.invoke('get-backup-size'),
  openURL: (url) => ipcRenderer.send('open-external', url)
});
