const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // JSON DB operations
  jsonQuery: (collection, filter, limit) => ipcRenderer.invoke('json-db-query', { collection, filter, limit }),
  jsonRun: (collection, action, payload, filter, uniqueCheck) => ipcRenderer.invoke('json-db-run', { collection, action, payload, filter, uniqueCheck }),
  jsonGet: (collection, filter) => ipcRenderer.invoke('json-db-get', { collection, filter }),
  logStaffAction: (logEntry) => ipcRenderer.invoke('log-staff-action', logEntry),
  wipeAllData: () => ipcRenderer.invoke('wipe-all-data'),
  isDevMode: () => ipcRenderer.invoke('is-dev-mode'),
  clearDevTestData: (staffName, pin) => ipcRenderer.invoke('clear-dev-test-data', { staffName, pin }),
  removeRaffleEntry: (contactId) => ipcRenderer.invoke('remove-raffle-entry', { contactId }),
  getKioskId: () => ipcRenderer.invoke('get-kiosk-id'),
  toggleKiosk: () => ipcRenderer.invoke('toggle-kiosk'),
  getKioskStatus: () => ipcRenderer.invoke('get-kiosk-status'),
  getLastBackupTime: () => ipcRenderer.invoke('get-last-backup-time'),
  getNextBackupTime: () => ipcRenderer.invoke('get-next-backup-time'),
  getBackupSize: () => ipcRenderer.invoke('get-backup-size'),
  getStaffNames: () => ipcRenderer.invoke('get-staff-names'),
  validateStaffPin: (name, pin) => ipcRenderer.invoke('validate-staff-pin', { name, pin }),
  openURL: (url) => ipcRenderer.send('open-external', url),
  getMobileSignupUrl: () => ipcRenderer.invoke('get-mobile-signup-url'),
  getColombiaRetreatSignupUrl: () => ipcRenderer.invoke('get-colombia-retreat-signup-url'),
  getCloudStaffUrl: () => ipcRenderer.invoke('get-cloud-staff-url'),
  openCloudStaffPage: () => ipcRenderer.invoke('open-cloud-staff-page'),
  getMobileSignupStatus: () => ipcRenderer.invoke('get-mobile-signup-status'),
  getPendingMobileSignups: (stream = 'booth') => ipcRenderer.invoke('get-pending-mobile-signups', { stream }),
  markColombiaRetreatInterest: (contactId, source, staffName) =>
    ipcRenderer.invoke('mark-colombia-retreat-interest', { contactId, source, staffName }),
  confirmMobileSignup: (contactId, staffName) => ipcRenderer.invoke('confirm-mobile-signup', { contactId, staffName }),
  denyMobileSignup: (contactId, staffName) => ipcRenderer.invoke('deny-mobile-signup', { contactId, staffName }),
  ensureGuestReference: (contactId) => ipcRenderer.invoke('ensure-guest-reference', contactId),
  onMobileSignupUpdate: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('mobile-signup-update', listener);
    return () => ipcRenderer.removeListener('mobile-signup-update', listener);
  },
});
