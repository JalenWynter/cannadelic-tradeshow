/** Booth guest reference IDs — CND-00001 style only */

export const GUEST_REF_RE = /^(CND|GE)-\d{5}$/i;

export function normalizeGuestReference(ref) {
  if (!ref) return null;
  const trimmed = String(ref).trim().toUpperCase();
  return GUEST_REF_RE.test(trimmed) ? trimmed : null;
}

export function isValidGuestReference(ref, contact = null) {
  const normalized = normalizeGuestReference(ref);
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, '');
  const phone = (contact?.phone || '').replace(/\D/g, '');
  if (phone && (digits === phone || phone.endsWith(digits) || digits.endsWith(phone))) {
    return false;
  }
  return true;
}

export function contactDisplayReference(contact) {
  if (!contact) return null;
  const candidates = [contact.guest_reference, contact.mobile_signup_display_id];
  for (const ref of candidates) {
    if (isValidGuestReference(ref, contact)) return normalizeGuestReference(ref);
  }
  return null;
}

export function nextLocalDisplayId(contacts, prefix = 'CND') {
  const maxNum = (contacts || []).reduce((max, c) => {
    const ref = contactDisplayReference(c);
    if (!ref || !ref.startsWith(prefix)) return max;
    const num = parseInt(ref.slice(prefix.length + 1), 10);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(5, '0')}`;
}

export function ensureGuestReference(db, contact, prefix = 'CND') {
  if (!contact) return null;
  const existing = contactDisplayReference(contact);
  if (existing) {
    contact.guest_reference = existing;
    contact.mobile_signup_display_id = existing;
    return existing;
  }
  const contacts = db.IN_MEMORY_DB?.Contacts || [];
  const newRef = nextLocalDisplayId(contacts, prefix);
  contact.guest_reference = newRef;
  contact.mobile_signup_display_id = newRef;
  db.persistToDisk?.('Contacts');
  return newRef;
}
