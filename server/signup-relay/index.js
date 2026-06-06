/**
 * Cloud signup relay — phones on LTE POST here; kiosks poll pending signups.
 */

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateSignupFields, normalizeEmail, normalizePhone } from './validateSignup.js';
import {
  securityHeaders,
  rateLimitSignup,
  rateLimitApprove,
  findExistingSignup,
  nextDisplayId,
  publicSignupPayload,
} from './security.js';
import { guestSignupPageHtml } from './guestSignupPage.js';
import { staffMonitorPageHtml, staffSignupRecord } from './staffMonitorPage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const API_KEY = process.env.RELAY_API_KEY || 'dev-change-me-before-show';
const STAFF_PIN = process.env.STAFF_MONITOR_PIN || null;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'signups.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');

function readSignups() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeSignups(signups) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(signups, null, 2), 'utf-8');
}

function requireApiKey(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function signupResponse(signup, extra = {}) {
  return {
    success: true,
    signupId: signup.signupId,
    displayId: signup.displayId,
    displayNumber: signup.displayNumber,
    status: signup.status,
    firstName: signup.firstName,
    lastName: signup.lastName || '',
    createdAt: signup.createdAt,
    confirmedAt: signup.confirmedAt || null,
    ...extra,
  };
}

const app = express();
app.use(securityHeaders);
app.use(cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'gudessence-signup-relay' });
});

app.get('/signup/:eventId', (req, res) => {
  const title = String(req.query.title || 'Cannadelic Night Market').slice(0, 80);
  res.type('html').send(guestSignupPageHtml(req.params.eventId, title));
});

app.get('/staff/:eventId', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(staffMonitorPageHtml(req.params.eventId));
});

app.get('/staff/all', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(staffMonitorPageHtml(['cannadelic-2026-06-06', 'colombia-retreat-cannadelic-2026-06-06']));
});

// GET /api/signup/all/public — returns all signups filtered by eventId query param (supports multi-ID comma-separated)
app.get('/api/signup/all/public', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const eventIds = req.query.eventId
    ? String(req.query.eventId).split(',').map((e) => e.trim())
    : null;
  const allSignups = readSignups();
  const filtered = eventIds
    ? allSignups.filter((s) =>
        eventIds.some((id) => String(s.eventId || '').includes(id))
      )
    : allSignups;
  const signups = filtered
    .sort((a, b) => {
      const aTime = a.status === 'confirmed' && a.confirmedAt ? a.confirmedAt : a.createdAt;
      const bTime = b.status === 'confirmed' && b.confirmedAt ? b.confirmedAt : b.createdAt;
      return new Date(bTime) - new Date(aTime);
    })
    .map(staffSignupRecord);
  const pending = signups.filter((s) => s.status === 'pending').length;
  const confirmed = signups.filter((s) => s.status === 'confirmed').length;
  const denied = signups.filter((s) => s.status === 'denied').length;
  res.json({ signups, total: signups.length, pending, confirmed, denied });
});

app.get('/api/signup/pending/public', (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  const signups = readSignups()
    .filter((s) => s.eventId === eventId && s.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((s) => ({
      signupId: s.signupId,
      displayId: s.displayId,
      firstName: s.firstName,
      lastName: s.lastName || '',
      email: s.email,
      phone: s.phone,
      createdAt: s.createdAt,
    }));
  res.json({ signups });
});

app.get('/api/signup/:signupId/status/public', (req, res) => {
  const signup = readSignups().find((s) => s.signupId === req.params.signupId);
  if (!signup) return res.status(404).json({ error: 'Signup not found' });
  res.json({
    ...publicSignupPayload(signup),
    firstName: signup.firstName,
    lastName: signup.lastName || '',
  });
});

app.post('/api/signup/:signupId/approve-staff', rateLimitApprove, (req, res) => {
  const { signupId } = req.params;
  const { staffName, staffPin, confirmed } = req.body || {};
  if (!confirmed) return res.status(400).json({ error: 'Confirmation required' });
  if (STAFF_PIN && staffPin !== STAFF_PIN) return res.status(403).json({ error: 'Invalid staff PIN' });

  const signups = readSignups();
  const signup = signups.find((s) => s.signupId === signupId);
  if (!signup) return res.status(404).json({ error: 'Signup not found' });
  if (signup.status === 'confirmed') return res.json({ success: true, signup: publicSignupPayload(signup) });

  signup.status = 'confirmed';
  signup.confirmedAt = new Date().toISOString();
  signup.confirmedByStaff = String(staffName || 'Staff').slice(0, 40);
  signup.confirmedByKiosk = 'Phone Staff Monitor';
  writeSignups(signups);

  res.json({ success: true, signup: publicSignupPayload(signup) });
});

app.post('/api/signup/:signupId/deny-staff', rateLimitApprove, (req, res) => {
  const { signupId } = req.params;
  const { staffName, staffPin, confirmed } = req.body || {};
  if (!confirmed) return res.status(400).json({ error: 'Confirmation required' });
  if (STAFF_PIN && staffPin !== STAFF_PIN) return res.status(403).json({ error: 'Invalid staff PIN' });

  const signups = readSignups();
  const signup = signups.find((s) => s.signupId === signupId);
  if (!signup) return res.status(404).json({ error: 'Signup not found' });
  if (signup.status === 'denied') return res.json({ success: true, signup: publicSignupPayload(signup) });
  if (signup.status === 'confirmed') {
    return res.status(400).json({ error: 'Cannot deny an already approved signup' });
  }

  signup.status = 'denied';
  signup.deniedAt = new Date().toISOString();
  signup.deniedByStaff = String(staffName || 'Staff').slice(0, 40);
  signup.deniedByKiosk = 'Phone Staff Monitor';
  writeSignups(signups);

  res.json({ success: true, signup: publicSignupPayload(signup) });
});

app.get('/api/signup/confirmed-recent', requireApiKey, (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const signups = readSignups()
    .filter((s) => s.eventId === eventId && s.status === 'confirmed' && new Date(s.confirmedAt).getTime() > since)
    .sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt));
  res.json({ signups });
});

app.get('/api/signup/denied-recent', requireApiKey, (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const signups = readSignups()
    .filter((s) => s.eventId === eventId && s.status === 'denied' && new Date(s.deniedAt).getTime() > since)
    .sort((a, b) => new Date(b.deniedAt) - new Date(a.deniedAt));
  res.json({ signups });
});

app.post('/api/signup', rateLimitSignup, (req, res) => {
  try {
    const { eventId, firstName, lastName, email, phone } = req.body || {};
    const validated = validateSignupFields({
      eventId,
      firstName,
      lastName,
      email,
      phone,
      requireEventId: true,
    });
    if (!validated.ok) {
      return res.status(400).json({ error: validated.errors[0] });
    }

    const signups = readSignups();
    const existing = findExistingSignup(signups, eventId, validated.email, validated.phone);

    if (existing?.status === 'confirmed') {
      return res.json(signupResponse(existing, {
        message: 'You are already approved for this event.',
      }));
    }

    if (existing?.status === 'pending') {
      return res.json(signupResponse(existing, {
        message: 'You already have a pending signup. See staff at the booth.',
      }));
    }

    const { displayId, displayNumber } = nextDisplayId(signups, eventId);
    const signup = {
      signupId: crypto.randomUUID(),
      displayId,
      displayNumber,
      eventId,
      firstName: validated.firstName,
      lastName: validated.lastName,
      email: validated.email,
      phone: validated.phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      confirmedByStaff: null,
      confirmedByKiosk: null,
    };

    signups.push(signup);
    writeSignups(signups);

    res.json(signupResponse(signup, {
      message: 'Signup received. Pending staff approval at the booth.',
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/signup/pending', requireApiKey, (req, res) => {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).json({ error: 'eventId query param required' });
  const signups = readSignups()
    .filter((s) => s.eventId === eventId && s.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ signups });
});

app.post('/api/signup/:signupId/confirm', requireApiKey, (req, res) => {
  const { signupId } = req.params;
  const { staffName, kioskLabel } = req.body || {};
  const signups = readSignups();
  const signup = signups.find((s) => s.signupId === signupId);
  if (!signup) return res.status(404).json({ error: 'Signup not found' });

  if (signup.status !== 'confirmed') {
    signup.status = 'confirmed';
    signup.confirmedAt = new Date().toISOString();
    signup.confirmedByStaff = String(staffName || 'Staff').slice(0, 40);
    signup.confirmedByKiosk = String(kioskLabel || 'Kiosk').slice(0, 40);
    writeSignups(signups);
  }

  res.json({ success: true, signup });
});

app.post('/api/signup/:signupId/deny', requireApiKey, (req, res) => {
  const { signupId } = req.params;
  const { staffName, kioskLabel } = req.body || {};
  const signups = readSignups();
  const signup = signups.find((s) => s.signupId === signupId);
  if (!signup) return res.status(404).json({ error: 'Signup not found' });
  if (signup.status === 'confirmed') {
    return res.status(400).json({ error: 'Cannot deny an already approved signup' });
  }

  if (signup.status !== 'denied') {
    signup.status = 'denied';
    signup.deniedAt = new Date().toISOString();
    signup.deniedByStaff = String(staffName || 'Staff').slice(0, 40);
    signup.deniedByKiosk = String(kioskLabel || 'Kiosk').slice(0, 40);
    writeSignups(signups);
  }

  res.json({ success: true, signup });
});

app.listen(PORT, () => {
  console.log(`Signup relay listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
