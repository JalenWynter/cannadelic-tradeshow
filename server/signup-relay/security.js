/** Basic security middleware for public relay */

const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const SIGNUP_MAX_PER_WINDOW = 8;
const APPROVE_MAX_PER_WINDOW = 30;

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function rateLimit({ keyPrefix, max }) {
  return (req, res, next) => {
    const ip = clientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
      bucket = { start: now, count: 0 };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    }
    next();
  };
}

export const rateLimitSignup = rateLimit({ keyPrefix: 'signup', max: SIGNUP_MAX_PER_WINDOW });
export const rateLimitApprove = rateLimit({ keyPrefix: 'approve', max: APPROVE_MAX_PER_WINDOW });

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
  );
  next();
}

export function findExistingSignup(signups, eventId, email, phone) {
  const e = email?.toLowerCase().trim() || '';
  const p = phone?.replace(/\D/g, '') || '';
  return signups.find((s) => {
    if (s.eventId !== eventId) return false;
    if (s.status === 'denied') return false;
    if (e && s.email?.toLowerCase() === e) return true;
    if (p && s.phone?.replace(/\D/g, '') === p) return true;
    return false;
  });
}

function displayPrefixForEventId(eventId) {
  const id = String(eventId || '');
  if (id.includes('colombia-retreat')) return 'COL';
  if (id.includes('cannadelic')) return 'CND';
  return 'GE';
}

function collectUsedDisplayIds(signups, eventId) {
  const used = new Set();
  for (const signup of signups) {
    if (signup.eventId !== eventId || !signup.displayId) continue;
    used.add(String(signup.displayId).trim().toUpperCase());
  }
  return used;
}

export function nextDisplayId(signups, eventId) {
  const eventSignups = signups.filter((s) => s.eventId === eventId);
  const used = collectUsedDisplayIds(signups, eventId);
  const maxNum = eventSignups.reduce((max, s) => Math.max(max, s.displayNumber || 0), 0);
  const prefix = displayPrefixForEventId(eventId);
  let displayNumber = maxNum + 1;
  let displayId = `${prefix}-${String(displayNumber).padStart(5, '0')}`;
  while (used.has(displayId)) {
    displayNumber += 1;
    displayId = `${prefix}-${String(displayNumber).padStart(5, '0')}`;
  }
  return { displayNumber, displayId };
}

export function publicSignupPayload(signup) {
  return {
    signupId: signup.signupId,
    displayId: signup.displayId,
    displayNumber: signup.displayNumber,
    eventId: signup.eventId,
    status: signup.status,
    firstName: signup.firstName,
    lastName: signup.lastName || '',
    email: signup.email ? maskEmail(signup.email) : '',
    phone: signup.phone ? maskPhone(signup.phone) : '',
    createdAt: signup.createdAt,
    confirmedAt: signup.confirmedAt || null,
    deniedAt: signup.deniedAt || null,
    deniedByStaff: signup.deniedByStaff || null,
    deniedByKiosk: signup.deniedByKiosk || null,
  };
}

function maskEmail(email) {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskPhone(phone) {
  const d = phone.replace(/\D/g, '');
  if (d.length < 4) return '***';
  return `***-***-${d.slice(-4)}`;
}
