import { app, BrowserWindow, ipcMain, screen, powerSaveBlocker, session, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import zlib from 'zlib';
import { createMobileSignupHandlers } from './mobileSignup.js';
import { reconcileAllGuestReferences } from './guestReference.js';
import { loadSignupConfig, isCloudSignupEnabled, resolveSignupUrls, isProductionCloudConfig } from './signupConfig.js';
import { createMobileSignupSync } from './mobileSignupSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userDataPath = app.getPath('userData');
const projectRoot = path.join(__dirname, '..');

// Prevent two kiosk instances fighting over the same DB files
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}
let staffRoster = [];

function getStaffRosterPaths() {
  const projectRoot = path.join(__dirname, '..');
  return {
    user: path.join(userDataPath, 'staff.roster.json'),
    show: path.join(projectRoot, 'config', 'staff.roster.show.json'),
    bundled: path.join(projectRoot, 'config', 'staff.roster.example.json'),
    localOverride: path.join(projectRoot, 'config', 'staff.roster.json'),
  };
}

function parseStaffRosterFile(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(parsed)) return null;
  const roster = parsed.filter((s) => s?.name && s?.pin);
  return roster.length ? roster : null;
}

function loadStaffRoster() {
  const { user: userPath, show: showPath, bundled: bundledPath, localOverride: overridePath } = getStaffRosterPaths();
  try {
    if (fs.existsSync(userPath)) {
      staffRoster = parseStaffRosterFile(userPath);
      if (staffRoster) return;
    }
    const sourcePath = [overridePath, showPath, bundledPath].find((p) => fs.existsSync(p));
    if (sourcePath) {
      staffRoster = parseStaffRosterFile(sourcePath);
      if (staffRoster) {
        fs.mkdirSync(userDataPath, { recursive: true });
        fs.writeFileSync(userPath, `${JSON.stringify(staffRoster, null, 2)}\n`);
        console.log(`Staff roster loaded from ${path.basename(sourcePath)} → ${userPath}`);
        return;
      }
    }
  } catch (err) {
    console.error('Failed to load staff roster:', err.message);
  }
  staffRoster = [];
}

function validateStaffPin(name, pin) {
  if (!name || pin == null) return false;
  const entry = staffRoster.find((s) => s.name === name);
  return Boolean(entry && String(entry.pin) === String(pin));
}

let windows = [];
let mobileSignupHandlers = null;
let mobileSignupSync = null;
let signupConfig = null;
let signupUrls = null;

// --- Multi-File DB Mapping ---
const DB_MAP = {
  Contacts: path.join(userDataPath, 'DB_Attendees.json'),
  Actions: path.join(userDataPath, 'DB_Settings.json'),
  Giveaways: path.join(userDataPath, 'DB_Settings.json'),
  UserActions: path.join(userDataPath, 'DB_Engagement.json'),
  GiveawayEntries: path.join(userDataPath, 'DB_Engagement.json'),
  Votes: path.join(userDataPath, 'DB_Engagement.json'),
  SupportTickets: path.join(userDataPath, 'DB_Engagement.json'),
  StaffLogs: path.join(userDataPath, 'StaffLogs.json')
};

// --- In-Memory Cache for Blazing Performance ---
const IN_MEMORY_DB = {};

// ID Keys for Deduplication
const ID_KEYS = {
  Contacts: 'contact_id',
  Actions: 'action_id',
  Giveaways: 'giveaway_id',
  UserActions: 'useraction_id',
  GiveawayEntries: ['giveawayentrie_id', 'giveawayentrieie_id'], // Handle both variations
  Votes: 'vote_id',
  SupportTickets: 'ticket_id',
  StaffLogs: 'timestamp'
};

function getUniqueId(item, collection) {
  const keys = ID_KEYS[collection];
  if (Array.isArray(keys)) {
    const key = keys.find(k => item[k] !== undefined);
    return item[key];
  }
  return item[keys];
}

function mergeData(collection, items) {
  if (!IN_MEMORY_DB[collection]) IN_MEMORY_DB[collection] = [];
  if (!Array.isArray(items)) return;

  items.forEach(newItem => {
    const newId = getUniqueId(newItem, collection);
    const existingIndex = IN_MEMORY_DB[collection].findIndex(ex => getUniqueId(ex, collection) === newId);
    
    if (existingIndex !== -1) {
      // Overlay data, preferring the newer version (last one loaded wins)
      IN_MEMORY_DB[collection][existingIndex] = { ...IN_MEMORY_DB[collection][existingIndex], ...newItem };
    } else {
      IN_MEMORY_DB[collection].push(newItem);
    }
  });
}

function findLatestBackupDir() {
  try {
    const backupsBase = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsBase)) return null;
    const folders = fs.readdirSync(backupsBase)
      .filter(f => fs.statSync(path.join(backupsBase, f)).isDirectory())
      .sort()
      .reverse();
    return folders.length > 0 ? path.join(backupsBase, folders[0]) : null;
  } catch (err) {
    return null;
  }
}

// Initialize Cache from Project bundled files, Backups, and Disk
function initDB() {
  const latestBackupDir = findLatestBackupDir();
  const dataGroups = [
    // 1. Bundle Base Files (lowest priority)
    { dir: __dirname, files: ['DB_Attendees.json', 'DB_Settings.json', 'DB_Engagement.json', 'StaffLogs.json'] },
    // 2. Latest Project Backup (medium priority)
    { dir: latestBackupDir, files: ['DB_Attendees.json', 'DB_Settings.json', 'DB_Engagement.json', 'StaffLogs.json'] },
    // 3. Persistent User Data (highest priority - active DB)
    { dir: userDataPath, files: ['DB_Attendees.json', 'DB_Settings.json', 'DB_Engagement.json', 'StaffLogs.json'] }
  ];

  dataGroups.forEach(group => {
    if (!group.dir || !fs.existsSync(group.dir)) return;

    group.files.forEach(fileName => {
      const filePath = path.join(group.dir, fileName);
      if (!fs.existsSync(filePath)) return;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.trim()) return;
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          mergeData('StaffLogs', data);
        } else {
          Object.keys(data).forEach(collection => {
            mergeData(collection, data[collection]);
          });
        }
      } catch (err) {
        console.error(`Load failure at ${filePath}:`, err.message);
      }
    });
  });

  // Ensure all collections exist in memory
  Object.keys(DB_MAP).forEach(c => { if (!IN_MEMORY_DB[c]) IN_MEMORY_DB[c] = []; });
  if (!IN_MEMORY_DB.StaffLogs) IN_MEMORY_DB.StaffLogs = [];

  const repairedRefs = reconcileAllGuestReferences({ IN_MEMORY_DB, persistToDisk });
  if (repairedRefs > 0) {
    console.log(`Guest references reconciled: ${repairedRefs} contact(s) labeled or reassigned`);
  }
}

function loadBundledSeedIntoMemory() {
  Object.keys(DB_MAP).forEach((collection) => {
    IN_MEMORY_DB[collection] = [];
  });
  IN_MEMORY_DB.StaffLogs = [];

  const bundledFiles = ['DB_Attendees.json', 'DB_Settings.json', 'DB_Engagement.json', 'StaffLogs.json'];
  for (const fileName of bundledFiles) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.trim()) continue;
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        mergeData('StaffLogs', data);
      } else {
        Object.keys(data).forEach((collection) => mergeData(collection, data[collection]));
      }
    } catch (err) {
      console.error(`Bundled seed load failed at ${filePath}:`, err.message);
    }
  }

  Object.keys(DB_MAP).forEach((c) => {
    if (!IN_MEMORY_DB[c]) IN_MEMORY_DB[c] = [];
  });
  if (!IN_MEMORY_DB.StaffLogs) IN_MEMORY_DB.StaffLogs = [];
}

async function resetDevTestDataToBundledSeed() {
  loadBundledSeedIntoMemory();
  await Promise.all([
    persistToDisk('Contacts'),
    persistToDisk('Actions'),
    persistToDisk('UserActions'),
    persistToDisk('StaffLogs'),
  ]);
}

// --- Write Queue & Atomic Write Helpers ---
let writeQueue = Promise.resolve();

async function persistToDisk(collection) {
  const filePath = DB_MAP[collection];
  const tempPath = filePath + '.tmp';

  // Get all keys associated with this physical file to save full object
  const fileKeys = Object.keys(DB_MAP).filter(k => DB_MAP[k] === filePath);
  let dataToSave;
  
  if (collection === 'StaffLogs') {
    dataToSave = IN_MEMORY_DB.StaffLogs;
  } else {
    dataToSave = {};
    fileKeys.forEach(k => { dataToSave[k] = IN_MEMORY_DB[k] || []; });
  }

  writeQueue = writeQueue.then(() => {
    return new Promise((resolve, reject) => {
      try {
        fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
        fs.renameSync(tempPath, filePath);
        resolve();
      } catch (err) {
        console.error(`Disk persistence failed for ${collection}:`, err.message);
        reject(err);
      }
    });
  });
  return writeQueue;
}

async function flushPendingWrites() {
  try {
    await writeQueue;
  } catch (err) {
    console.error('Flush pending writes failed:', err.message);
  }
}

// --- Automated Backup System (Every 10 Minutes with Compression & Deletion) ---
let lastBackupTime = null;
let nextBackupTime = Date.now() + 300000;
const backupDirPrimary = path.join(userDataPath, 'backups');
const backupDirSecondary = path.join(__dirname, 'backups'); // Local project dir

if (!fs.existsSync(backupDirPrimary)) fs.mkdirSync(backupDirPrimary, { recursive: true });
// Try to create secondary backup dir if it doesn't exist (might fail in production asar)
try { if (!fs.existsSync(backupDirSecondary)) fs.mkdirSync(backupDirSecondary, { recursive: true }); } catch(e) {}

function runBackup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.json.gz`;
  
  const backupFilePrimary = path.join(backupDirPrimary, backupFileName);
  const backupFileSecondary = path.join(backupDirSecondary, backupFileName);

  try {
    // Create compressed backup of the entire in-memory DB
    const data = JSON.stringify(IN_MEMORY_DB);
    const compressed = zlib.gzipSync(data);
    
    // Save to Primary (UserData - Always writable)
    fs.writeFileSync(backupFilePrimary, compressed);
    lastBackupTime = new Date().toISOString();
    nextBackupTime = Date.now() + 300000;

    // Save to Secondary (Project Dir - Writable in Dev/Unpackaged)
    try { fs.writeFileSync(backupFileSecondary, compressed); } catch(e) {}

    // --- Clean up: Delete backups older than 7 days in both locations ---
    [backupDirPrimary, backupDirSecondary].forEach(dir => {
      try {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs < sevenDaysAgo) {
            if (stats.isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
            else fs.unlinkSync(filePath);
          }
        });
      } catch(e) {}
    });
  } catch (err) {
    console.error('Backup failed:', err.message);
  }
}

setInterval(runBackup, 300000); // 5 minutes (Optimized for 6-hour event)

// --- Kiosk Identification ---
function getKioskId(webContents) {
  const index = windows.findIndex(win => win.webContents === webContents);
  return index !== -1 ? `Kiosk ${index + 1}` : 'Unknown';
}

// --- IPC Handlers (Now Reading from Memory) ---
const EDITABLE_COLLECTIONS = ['Contacts', 'UserActions', 'GiveawayEntries', 'Votes', 'StaffLogs', 'SupportTickets', 'Giveaways'];

ipcMain.handle('get-kiosk-id', (event) => {
  return getKioskId(event.sender);
});

ipcMain.handle('get-staff-names', () => (Array.isArray(staffRoster) ? staffRoster : []).map((s) => s.name));

ipcMain.handle('validate-staff-pin', (event, { name, pin }) => {
  return validateStaffPin(name, pin);
});

ipcMain.handle('json-db-get', async (event, { collection, filter }) => {
  const items = IN_MEMORY_DB[collection] || [];
  return items.find(item => Object.entries(filter).every(([k, v]) => {
    const itemVal = item[k];
    if (typeof v === 'string' && typeof itemVal === 'string') {
      return itemVal.toLowerCase() === v.toLowerCase();
    }
    return itemVal === v;
  }));
});

ipcMain.handle('json-db-query', async (event, { collection, filter = {}, limit = 0 }) => {
  let items = IN_MEMORY_DB[collection] || [];
  if (Object.keys(filter).length > 0) {
    items = items.filter(item => Object.entries(filter).every(([k, v]) => {
      const itemVal = item[k];
      if (typeof v === 'string' && typeof itemVal === 'string') {
        return itemVal.toLowerCase() === v.toLowerCase();
      }
      return itemVal === v;
    }));
  }
  if (collection === 'Contacts') items = [...items].reverse();
  if (limit > 0) items = items.slice(0, limit);
  return items;
});

ipcMain.handle('json-db-run', async (event, { collection, action, payload, filter = {}, uniqueCheck = null }) => {
  // Security: Only allow specific collections to be modified via IPC
  if (!EDITABLE_COLLECTIONS.includes(collection)) {
    throw new Error(`Permission Denied: Cannot modify ${collection} collection.`);
  }

  if (!IN_MEMORY_DB[collection]) IN_MEMORY_DB[collection] = [];
  let result = { changes: 0 };

  const kioskId = getKioskId(event.sender);

  // SANITIZATION: Force standard formats at DB level
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  if (payload.phone) payload.phone = payload.phone.replace(/\D/g, '');

  if (action === 'insert') {
    // ATOMIC UNIQUE CHECK: Prevent race conditions
    if (uniqueCheck) {
      const isDuplicate = IN_MEMORY_DB[collection].some(item => 
        Object.entries(uniqueCheck).every(([k, v]) => {
          const itemVal = item[k];
          if (typeof v === 'string' && typeof itemVal === 'string') {
            return itemVal.toLowerCase() === v.toLowerCase();
          }
          return itemVal === v;
        })
      );
      if (isDuplicate) throw new Error('Record already exists (Atomic Check)');
    }

    const idKey = collection.slice(0, -1).toLowerCase() + '_id';
    const maxId = IN_MEMORY_DB[collection].reduce((max, item) => Math.max(max, item[idKey] || 0), 0);
    payload[idKey] = maxId + 1;
    
    // Label data source
    payload.source_kiosk = kioskId;
    payload.created_at = new Date().toISOString();

    IN_MEMORY_DB[collection].push(payload);
    result.id = payload[idKey];
    result.changes = 1;
  } 
  else if (action === 'update') {
    const index = IN_MEMORY_DB[collection].findIndex(item => Object.entries(filter).every(([k, v]) => item[k] === v));
    if (index !== -1) {
      payload.updated_at = new Date().toISOString();
      payload.last_updated_by_kiosk = kioskId;
      IN_MEMORY_DB[collection][index] = { ...IN_MEMORY_DB[collection][index], ...payload };
      result.changes = 1;
    }
  }

  // Trigger async write to disk
  persistToDisk(collection);
  return result;
});

ipcMain.handle('log-staff-action', async (event, logEntry) => {
  const kioskId = getKioskId(event.sender);
  IN_MEMORY_DB.StaffLogs.push({ 
    ...logEntry, 
    timestamp: new Date().toISOString(),
    source_kiosk: kioskId 
  });
  persistToDisk('StaffLogs');
  return { success: true };
});

ipcMain.handle('remove-raffle-entry', async (event, { contactId }) => {
  const entries = IN_MEMORY_DB.GiveawayEntries || [];
  let lastIndex = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].contact_id === contactId) {
      lastIndex = i;
      break;
    }
  }

  if (lastIndex !== -1) {
    entries.splice(lastIndex, 1);
    persistToDisk('GiveawayEntries');
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('toggle-kiosk', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const isKiosk = win.isKiosk();
    win.setKiosk(!isKiosk);
    return !isKiosk;
  }
  return false;
});

ipcMain.handle('get-kiosk-status', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isKiosk() : false;
});

ipcMain.handle('get-last-backup-time', () => lastBackupTime);
ipcMain.handle('get-next-backup-time', () => nextBackupTime);

ipcMain.handle('get-backup-size', async () => {
  const getDirSize = (dir) => {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) size += stats.size;
      else if (stats.isDirectory()) size += getDirSize(filePath);
    }
    return size;
  };
  
  const sizePrimary = getDirSize(backupDirPrimary);
  const sizeSecondary = getDirSize(backupDirSecondary);
  const totalBytes = sizePrimary + sizeSecondary;
  
  if (totalBytes < 1024) return `${totalBytes} B`;
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
});

ipcMain.handle('is-dev-mode', () => !app.isPackaged);

ipcMain.handle('clear-dev-test-data', async (event, { staffName, pin }) => {
  if (app.isPackaged) {
    throw new Error('Clear test data is only available during npm run dev');
  }
  if (!validateStaffPin(staffName, pin)) {
    throw new Error('Invalid staff PIN');
  }

  await resetDevTestDataToBundledSeed();

  IN_MEMORY_DB.StaffLogs.push({
    type: 'DEV_TEST_DATA_CLEAR',
    staff_name: staffName,
    timestamp: new Date().toISOString(),
    source_kiosk: getKioskId(event.sender),
  });
  await persistToDisk('StaffLogs');
  broadcastMobileSignupUpdate();

  return { success: true };
});

ipcMain.handle('wipe-all-data', async (event) => {
  const kioskId = getKioskId(event.sender);
  IN_MEMORY_DB.Contacts = [];
  IN_MEMORY_DB.UserActions = [];
  IN_MEMORY_DB.GiveawayEntries = [];
  IN_MEMORY_DB.Votes = [];
  IN_MEMORY_DB.StaffLogs = [];

  await Promise.all([
    persistToDisk('Contacts'),
    persistToDisk('UserActions'),
    persistToDisk('StaffLogs')
  ]);

  // Log the wipe
  IN_MEMORY_DB.StaffLogs.push({ 
    type: 'SYSTEM_WIPE', 
    timestamp: new Date().toISOString(), 
    source_kiosk: kioskId 
  });
  persistToDisk('StaffLogs');
  
  return { success: true };
});

function broadcastMobileSignupUpdate() {
  windows.forEach((win) => {
    if (!win.isDestroyed()) win.webContents.send('mobile-signup-update');
  });
}

function initMobileSignup() {
  if (!mobileSignupHandlers) {
    mobileSignupHandlers = createMobileSignupHandlers({ IN_MEMORY_DB, persistToDisk });
  }

  signupConfig = loadSignupConfig(projectRoot, userDataPath);
  signupUrls = resolveSignupUrls(signupConfig);

  if (isCloudSignupEnabled(signupConfig) && !mobileSignupSync) {
    mobileSignupSync = createMobileSignupSync(
      {
        ...signupConfig,
        ...signupUrls,
        colombiaEventId: signupUrls.colombiaEventId,
        publicSignupUrl: signupUrls.publicSignupUrl,
        publicColombiaSignupUrl: signupUrls.publicColombiaSignupUrl,
      },
      mobileSignupHandlers,
      () => {
        broadcastMobileSignupUpdate();
      }
    );
    mobileSignupSync.start();
    console.log(`HTTPS mobile signup: ${signupUrls.publicSignupUrl}`);
    console.log(`HTTPS Colombia retreat signup: ${signupUrls.publicColombiaSignupUrl}`);
    console.log(`HTTPS staff monitor: ${signupUrls.publicStaffUrl}`);
    if (signupUrls.localDev) {
      console.log(`DEV: Phone QR requires same Wi‑Fi — not LTE or offline (${signupUrls.phoneNetworkHint})`);
    }
    if (signupUrls.tunnelActive) {
      console.log(`DEV tunnel (${signupUrls.tunnelProvider}): phones use LTE/any Wi‑Fi → ${signupUrls.publicSignupUrl}`);
    }
    if (signupUrls.deploymentMode === 'production-cloud') {
      console.log('Production cloud relay — kiosk needs internet (hotspot OK); guests use LTE via same relay');
    }
    return;
  }

  console.warn('Cloud signup not configured — bundled config/signup-sync.show.json should load automatically on show PCs.');
}

function openCloudPagesOnLaunch() {
  if (!isCloudSignupEnabled(signupConfig) || !signupUrls) return;
  console.log(`Opening HTTPS staff monitor: ${signupUrls.publicStaffUrl}`);
  shell.openExternal(signupUrls.publicStaffUrl).catch((err) => {
    console.error('Could not auto-open HTTPS staff page:', err.message);
  });
}

ipcMain.handle('get-mobile-signup-url', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  return signupUrls?.publicSignupUrl || null;
});

ipcMain.handle('get-colombia-retreat-signup-url', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  return signupUrls?.publicColombiaSignupUrl || null;
});

ipcMain.handle('get-cloud-staff-url', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  if (signupUrls?.publicStaffUrl) return signupUrls.publicStaffUrl;
  if (signupUrls?.relayApiUrl) {
    const base = signupUrls.relayApiUrl.replace(/\/$/, '');
    return `${base}/staff/all`;
  }
  return null;
});

ipcMain.handle('open-cloud-staff-page', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  openCloudPagesOnLaunch();
  return signupUrls?.publicStaffUrl || null;
});

ipcMain.handle('get-mobile-signup-status', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  if (mobileSignupSync) {
    return {
      ...mobileSignupSync.getStatus(),
      publicStaffUrl: signupUrls?.publicStaffUrl || null,
      publicSignupUrl: signupUrls?.publicSignupUrl || null,
      publicColombiaSignupUrl: signupUrls?.publicColombiaSignupUrl || null,
      publicColombiaStaffUrl: signupUrls?.publicColombiaStaffUrl || null,
      localDev: signupUrls?.localDev || false,
      tunnelActive: signupUrls?.tunnelActive || false,
      tunnelProvider: signupUrls?.tunnelProvider || null,
      deploymentMode: signupUrls?.deploymentMode || 'disabled',
      phoneNetworkHint: signupUrls?.phoneNetworkHint || null,
    };
  }
  return {
    mode: 'disabled',
    connected: false,
    publicSignupUrl: signupUrls?.publicSignupUrl || null,
    publicStaffUrl: signupUrls?.publicStaffUrl || null,
    configPath: signupConfig?.configPath || null,
    lastError: signupConfig
      ? (signupUrls ? 'Relay offline or misconfigured — check relayApiUrl & relayApiKey' : 'signup-sync.json missing relayApiUrl or eventId')
      : `No signup-sync.json found — create one at ${path.join(userDataPath, 'signup-sync.json')} (see docs/show-day-setup.md)`,
  };
});

ipcMain.handle('ensure-guest-reference', (contactId) => {
  if (!mobileSignupHandlers) initMobileSignup();
  const contact = (IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
  if (!contact) return null;
  mobileSignupHandlers.ensureGuestReference(contact);
  return contact;
});

ipcMain.handle('get-pending-mobile-signups', (_event, { stream } = {}) => {
  if (!mobileSignupHandlers) initMobileSignup();
  return mobileSignupHandlers.getPendingMobileSignups({ stream: stream || 'booth' });
});

ipcMain.handle('get-all-pending-mobile-signups', () => {
  if (!mobileSignupHandlers) initMobileSignup();
  return mobileSignupHandlers.getAllPendingMobileSignups();
});

ipcMain.handle('mark-colombia-retreat-interest', (_event, { contactId, source, staffName }) => {
  if (!mobileSignupHandlers) initMobileSignup();
  return mobileSignupHandlers.markColombiaRetreatInterest(
    contactId,
    source || 'kiosk_early_bird',
    staffName || 'System'
  );
});

ipcMain.handle('confirm-mobile-signup', async (event, { contactId, staffName }) => {
  if (!mobileSignupHandlers) initMobileSignup();
  const kioskLabel = getKioskId(event.sender);
  const result = mobileSignupHandlers.confirmMobileSignup(contactId, kioskLabel, staffName || 'Staff');
  if (result.remote_signup_id && mobileSignupSync) {
    await mobileSignupSync.confirmRemoteSignup(result.remote_signup_id, staffName || 'Staff', kioskLabel);
  }
  broadcastMobileSignupUpdate();
  return result;
});

ipcMain.handle('deny-mobile-signup', async (event, { contactId, staffName }) => {
  if (!mobileSignupHandlers) initMobileSignup();
  const kioskLabel = getKioskId(event.sender);
  const result = mobileSignupHandlers.denyMobileSignup(contactId, kioskLabel, staffName || 'Staff');
  if (result.remote_signup_id && mobileSignupSync) {
    await mobileSignupSync.denyRemoteSignup(result.remote_signup_id, staffName || 'Staff', kioskLabel);
  }
  broadcastMobileSignupUpdate();
  return result;
});

function createWindows() {
  if (app.isPackaged) {
    console.log(`Production kiosk — userData: ${userDataPath}`);
  }
  loadStaffRoster();
  initDB(); // Load cache before windows open
  initMobileSignup();

  // Security: Clear all local sessions on app boot to ensure every day starts fresh
  // This prevents "zombie logins" from the previous day
  session.defaultSession.clearStorageData({ storages: ['localstorage'] });

  // Prevent the PC from sleeping during the tradeshow
  powerSaveBlocker.start('prevent-app-suspension');

  const displays = screen.getAllDisplays();

  const kioskMode = app.isPackaged || process.env.KIOSK_MODE === '1';

  displays.forEach((display) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: kioskMode,
      kiosk: kioskMode,
      alwaysOnTop: kioskMode,
      webPreferences: { 
        preload: path.join(__dirname, '../preload.js'), 
        contextIsolation: true, 
        nodeIntegration: false 
      },
    });

    // Disable Right-Click Context Menu
    win.webContents.on('context-menu', (e) => e.preventDefault());

    // Disable Pinch-to-Zoom
    win.webContents.on('did-finish-load', () => {
      win.webContents.setVisualZoomLevelLimits(1, 1);
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    if (!app.isPackaged) {
      win.loadURL(devServerUrl);
    } else {
      win.loadFile(path.join(__dirname, '../index.html'));
    }
    
    windows.push(win);
  });

  setTimeout(() => openCloudPagesOnLaunch(), 2000);
}

ipcMain.on('open-external', (event, url) => {
  if (typeof url !== 'string') return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return;
    shell.openExternal(url);
  } catch {
    // ignore invalid URLs
  }
});

app.whenReady().then(createWindows);

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.show();
        win.focus();
      }
    }
  });
}

let isFlushingOnQuit = false;
app.on('before-quit', (event) => {
  if (isFlushingOnQuit) return;
  event.preventDefault();
  isFlushingOnQuit = true;
  flushPendingWrites().finally(() => app.exit(0));
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });