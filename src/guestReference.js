/** Booth guest reference IDs — CND-00001 style only */

export const GUEST_REF_RE = /^(CND|GE|COL)-\d{5}$/i;

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

export function hasPrehistoricGuestReference(contact) {
  return Boolean(contact?.guest_reference_prehistoric);
}

export function getLegacyGuestReference(contact) {
  return contact?.legacy_guest_reference || null;
}

/** Move invalid stored refs into legacy fields so they never block new CND assignment. */
export function capturePrehistoricGuestReference(contact) {
  if (!contact) return false;
  let labeled = false;

  for (const field of ['guest_reference', 'mobile_signup_display_id']) {
    const raw = contact[field];
    if (!raw) continue;
    const normalized = normalizeGuestReference(raw);
    const valid = normalized && isValidGuestReference(normalized, contact);
    if (valid) continue;

    if (!contact.legacy_guest_reference) {
      contact.legacy_guest_reference = String(raw).trim();
    }
    contact.guest_reference_prehistoric = true;
    delete contact[field];
    labeled = true;
  }

  return labeled;
}

export function collectUsedGuestReferences(contacts, excludeContactId = null) {
  const used = new Map();
  for (const contact of contacts || []) {
    if (excludeContactId != null && contact.contact_id === excludeContactId) continue;
    const ref = contactDisplayReference(contact);
    if (ref) used.set(ref, contact.contact_id);
  }
  return used;
}

function nextRefFromUsed(used, prefix, startNum = 0) {
  let maxNum = startNum;
  for (const ref of used.keys()) {
    if (!ref.startsWith(`${prefix}-`)) continue;
    const num = parseInt(ref.slice(prefix.length + 1), 10);
    if (Number.isFinite(num)) maxNum = Math.max(maxNum, num);
  }

  let candidate = maxNum + 1;
  while (used.has(`${prefix}-${String(candidate).padStart(5, '0')}`)) {
    candidate += 1;
  }
  return `${prefix}-${String(candidate).padStart(5, '0')}`;
}

export function nextLocalDisplayId(contacts, prefix = 'CND', excludeContactId = null) {
  const used = collectUsedGuestReferences(contacts, excludeContactId);
  return nextRefFromUsed(used, prefix);
}

export function claimGuestReference(db, contact, desiredRef, prefix = 'CND') {
  if (!contact) return null;
  capturePrehistoricGuestReference(contact);

  const contacts = db.IN_MEMORY_DB?.Contacts || [];
  const normalized = normalizeGuestReference(desiredRef);
  if (!normalized || !isValidGuestReference(normalized, contact)) {
    return ensureGuestReference(db, contact, prefix);
  }

  const used = collectUsedGuestReferences(contacts, contact.contact_id);
  const ownerId = used.get(normalized);
  if (!ownerId || ownerId === contact.contact_id) {
    contact.guest_reference = normalized;
    contact.mobile_signup_display_id = normalized;
    db.persistToDisk?.('Contacts');
    return normalized;
  }

  const owner = contacts.find((c) => c.contact_id === ownerId);
  if (contact.remote_signup_id && !owner?.remote_signup_id) {
    ensureGuestReference(db, owner, prefix);
    contact.guest_reference = normalized;
    contact.mobile_signup_display_id = normalized;
    db.persistToDisk?.('Contacts');
    return normalized;
  }

  return ensureGuestReference(db, contact, prefix);
}

export function ensureGuestReference(db, contact, prefix = 'CND') {
  if (!contact) return null;
  capturePrehistoricGuestReference(contact);

  const contacts = db.IN_MEMORY_DB?.Contacts || [];
  const existing = contactDisplayReference(contact);
  if (existing) {
    const ownerId = collectUsedGuestReferences(contacts, contact.contact_id).get(existing);
    if (!ownerId || ownerId === contact.contact_id) {
      contact.guest_reference = existing;
      contact.mobile_signup_display_id = existing;
      db.persistToDisk?.('Contacts');
      return existing;
    }
    contact.previous_guest_reference = existing;
    contact.guest_reference_reassigned = true;
  }

  const newRef = nextLocalDisplayId(contacts, prefix, contact.contact_id);
  contact.guest_reference = newRef;
  contact.mobile_signup_display_id = newRef;
  db.persistToDisk?.('Contacts');
  return newRef;
}

/** One-pass repair: label prehistoric refs and guarantee unique CND numbers across all contacts. */
export function reconcileAllGuestReferences(db, prefix = 'CND') {
  const contacts = db.IN_MEMORY_DB?.Contacts || [];
  if (!contacts.length) return 0;

  let changed = 0;
  const used = new Set();
  const sorted = [...contacts].sort((a, b) => {
    const aRemote = a.remote_signup_id ? 0 : 1;
    const bRemote = b.remote_signup_id ? 0 : 1;
    if (aRemote !== bRemote) return aRemote - bRemote;
    return (a.contact_id || 0) - (b.contact_id || 0);
  });

  for (const contact of sorted) {
    const hadReferenceData = Boolean(
      contact.guest_reference
      || contact.mobile_signup_display_id
      || contact.legacy_guest_reference
      || contact.guest_reference_prehistoric
    );

    if (capturePrehistoricGuestReference(contact)) changed += 1;

    let ref = contactDisplayReference(contact);
    if (ref && used.has(ref)) {
      contact.previous_guest_reference = ref;
      contact.guest_reference_reassigned = true;
      ref = null;
      changed += 1;
    }

    if (!ref && hadReferenceData) {
      ref = nextRefFromUsed(used, prefix);
      contact.guest_reference = ref;
      contact.mobile_signup_display_id = ref;
      changed += 1;
    } else if (ref) {
      contact.guest_reference = ref;
      contact.mobile_signup_display_id = ref;
    }

    if (ref) used.add(ref);
  }

  if (changed) db.persistToDisk?.('Contacts');
  return changed;
}
