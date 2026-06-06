/** Main-process mobile QR signup helpers (shared local DB) */

import { validateSignupFields, normalizeEmail, normalizePhone } from './signupValidation.js';
import {
  contactDisplayReference,
  claimGuestReference,
  ensureGuestReference,
} from './guestReference.js';
import {
  COLOMBIA_RETREAT_SOURCES,
  SIGNUP_STREAMS,
  signupStreamForEventId,
} from './retreatInterest.js';

export function contactGuestReference(contact) {
  return contactDisplayReference(contact);
}

function isRemoteSignupDenied(db, remoteSignupId) {
  if (!remoteSignupId) return false;
  const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.remote_signup_id === remoteSignupId);
  if (contact?.mobile_signup_denied || contact?.signup_status === 'declined') return true;
  return (db.IN_MEMORY_DB.StaffLogs || []).some(
    (log) => log.type === 'MOBILE_SIGNUP_DENY' && log.remote_signup_id === remoteSignupId
  );
}

function findContact(db, email, phone) {
  const contacts = db.IN_MEMORY_DB.Contacts || [];
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  if (e) {
    const byEmail = contacts.find((c) => c.email?.toLowerCase() === e);
    if (byEmail) return byEmail;
  }
  if (p) {
    const byPhone = contacts.find((c) => c.phone === p);
    if (byPhone) return byPhone;
  }
  return null;
}

function awardPoints(db, contactId, actionName) {
  const action = (db.IN_MEMORY_DB.Actions || []).find((a) => a.action_name === actionName);
  if (!action) return;

  const existing = (db.IN_MEMORY_DB.UserActions || []).find(
    (ua) => ua.contact_id === contactId && ua.action_id === action.action_id
  );
  if (existing) return;

  const maxId = (db.IN_MEMORY_DB.UserActions || []).reduce(
    (max, item) => Math.max(max, item.useraction_id || 0),
    0
  );
  db.IN_MEMORY_DB.UserActions.push({
    useraction_id: maxId + 1,
    contact_id: contactId,
    action_id: action.action_id,
    timestamp: new Date().toISOString(),
  });

  const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
  if (contact) {
    contact.total_points = (contact.total_points || 0) + (action.points_awarded || 0);
    contact.updated_at = new Date().toISOString();
  }

  db.persistToDisk('UserActions');
  db.persistToDisk('Contacts');
}

function revertBoothVisitPoints(db, contactId) {
  const action = (db.IN_MEMORY_DB.Actions || []).find((a) => a.action_name === 'Booth Visit');
  if (!action) return;
  db.IN_MEMORY_DB.UserActions = (db.IN_MEMORY_DB.UserActions || []).filter(
    (ua) => !(ua.contact_id === contactId && ua.action_id === action.action_id)
  );
  const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
  if (contact) {
    contact.total_points = Math.max(0, (contact.total_points || 0) - (action.points_awarded || 0));
    contact.updated_at = new Date().toISOString();
  }
  db.persistToDisk('UserActions');
  db.persistToDisk('Contacts');
}

function applySignupStreamMetadata(contact, { signupStream, remoteEventId } = {}) {
  if (signupStream) contact.signup_stream = signupStream;
  if (remoteEventId) contact.remote_event_id = remoteEventId;
  if (signupStream === SIGNUP_STREAMS.COLOMBIA_RETREAT) {
    contact.signup_source = 'colombia_retreat_qr';
  }
}

function mapPendingSignup(contact) {
  return {
    contact_id: contact.contact_id,
    remote_signup_id: contact.remote_signup_id || null,
    signup_stream: contact.signup_stream || SIGNUP_STREAMS.BOOTH,
    guest_reference: contactGuestReference(contact),
    display_id: contactGuestReference(contact),
    name: contact.name,
    first_name: contact.first_name || contact.name?.split(' ')[0] || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    is_new: Boolean(contact.mobile_signup_is_new),
    signed_up_at: contact.mobile_signup_at || contact.created_at,
    confirmed_at: contact.mobile_signup_confirmed_at || null,
  };
}

export function createMobileSignupHandlers(db) {
  const markColombiaRetreatInterest = (contactId, source, staffName = 'System') => {
    const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
    if (!contact) throw new Error('Contact not found');

    contact.colombia_retreat_interest = true;
    contact.colombia_retreat_source = source;
    contact.colombia_retreat_at = contact.colombia_retreat_at || new Date().toISOString();
    contact.updated_at = new Date().toISOString();
    awardPoints(db, contactId, 'Retreat Interest');

    const entries = db.IN_MEMORY_DB.GiveawayEntries || [];
    const maxEntryId = entries.reduce((max, item) => Math.max(max, item.giveawayentrie_id || item.giveawayentrieie_id || 0), 0);
    entries.push({
      giveawayentrie_id: maxEntryId + 1,
      contact_id: contactId,
      source: 'Retreat Interest',
      timestamp: contact.colombia_retreat_at,
    });
    db.persistToDisk('GiveawayEntries');
    db.persistToDisk('Contacts');

    db.IN_MEMORY_DB.StaffLogs.push({
      type: 'COLOMBIA_RETREAT_INTEREST',
      contact_id: contactId,
      contact_name: contact.name,
      guest_reference: contactGuestReference(contact),
      source,
      staff_name: staffName,
      timestamp: contact.colombia_retreat_at,
      source_kiosk: 'Colombia Retreat',
    });
    db.persistToDisk('StaffLogs');

    return contact;
  };

  const registerMobileSignup = ({
    firstName,
    lastName,
    email,
    phone,
    remoteSignupId = null,
    signupStream = SIGNUP_STREAMS.BOOTH,
    remoteEventId = null,
  }) => {
    const validated = validateSignupFields({ firstName, lastName, email, phone });
    const e = validated.email;
    const p = validated.phone;
    const fn = validated.firstName;
    const ln = validated.lastName;

    if (remoteSignupId) {
      const existingRemote = (db.IN_MEMORY_DB.Contacts || []).find(
        (c) => c.remote_signup_id === remoteSignupId
      );
      if (existingRemote) {
        if (existingRemote.mobile_signup_denied || existingRemote.signup_status === 'declined') {
          return { contactId: existingRemote.contact_id, isNew: false, contact: existingRemote, pending: false, imported: false, skipped: true };
        }
        if (existingRemote.mobile_signup_confirmed) {
          return { contactId: existingRemote.contact_id, isNew: false, contact: existingRemote, pending: false, imported: false, skipped: true };
        }
        return { contactId: existingRemote.contact_id, isNew: false, contact: existingRemote, pending: true, imported: false };
      }
    }

    let contact = findContact(db, e, p);
    const now = new Date().toISOString();

    if (contact) {
      if (contact.mobile_signup_denied || contact.signup_status === 'declined') {
        return { contactId: contact.contact_id, isNew: false, contact, pending: false, imported: false, skipped: true };
      }
      contact.mobile_signup_denied = false;
      contact.mobile_signup_denied_at = null;
      contact.mobile_signup_denied_by = null;
      contact.mobile_signup_denied_by_staff = null;
      contact.mobile_signup_pending = true;
      contact.mobile_signup_confirmed = false;
      contact.mobile_signup_at = now;
      contact.mobile_signup_is_new = false;
      contact.signup_source = contact.signup_source || (signupStream === SIGNUP_STREAMS.COLOMBIA_RETREAT ? 'colombia_retreat_qr' : 'mobile_qr');
      applySignupStreamMetadata(contact, { signupStream, remoteEventId });
      if (remoteSignupId) contact.remote_signup_id = remoteSignupId;
      contact.updated_at = now;
      db.persistToDisk('Contacts');
      return { contactId: contact.contact_id, isNew: false, contact, pending: true, imported: true };
    }

    const fullName = `${fn} ${ln}`.trim();
    const maxId = (db.IN_MEMORY_DB.Contacts || []).reduce(
      (max, item) => Math.max(max, item.contact_id || 0),
      0
    );

    const payload = {
      contact_id: maxId + 1,
      name: fullName,
      first_name: fn,
      last_name: ln,
      email: e,
      phone: p,
      physical_tickets: [],
      is_vip: false,
      total_points: 0,
      flower_claimed: false,
      signup_source: signupStream === SIGNUP_STREAMS.COLOMBIA_RETREAT ? 'colombia_retreat_qr' : 'mobile_qr',
      signup_stream: signupStream,
      remote_event_id: remoteEventId,
      mobile_signup_pending: true,
      mobile_signup_confirmed: false,
      mobile_signup_is_new: true,
      mobile_signup_at: now,
      remote_signup_id: remoteSignupId,
      source_kiosk: signupStream === SIGNUP_STREAMS.COLOMBIA_RETREAT ? 'Colombia Retreat QR' : 'Mobile QR',
      created_at: now,
    };

    db.IN_MEMORY_DB.Contacts.push(payload);
    db.persistToDisk('Contacts');
    if (signupStream !== SIGNUP_STREAMS.COLOMBIA_RETREAT) {
      awardPoints(db, payload.contact_id, 'Booth Visit');
    }

    return { contactId: payload.contact_id, isNew: true, contact: payload, pending: true, imported: true };
  };

  const recordRemoteSignupDenial = (remoteSignupId, staffName, kioskLabel, guestRef = null) => {
    if (!remoteSignupId || isRemoteSignupDenied(db, remoteSignupId)) {
      return { success: true, already: true };
    }
    const now = new Date().toISOString();
    db.IN_MEMORY_DB.StaffLogs.push({
      type: 'MOBILE_SIGNUP_DENY',
      remote_signup_id: remoteSignupId,
      guest_reference: guestRef,
      staff_name: staffName,
      timestamp: now,
      source_kiosk: kioskLabel,
    });
    db.persistToDisk('StaffLogs');
    return { success: true, recorded: true };
  };

  const importRemoteSignup = (remote) => {
    if (remote?.signupId && isRemoteSignupDenied(db, remote.signupId)) {
      return { imported: false, skipped: true, pending: false };
    }
    const signupStream = remote.signupStream || signupStreamForEventId(remote.eventId);
    const result = registerMobileSignup({
      firstName: remote.firstName,
      lastName: remote.lastName || '',
      email: remote.email || '',
      phone: remote.phone || '',
      remoteSignupId: remote.signupId,
      signupStream,
      remoteEventId: remote.eventId || null,
    });
    if (result?.contact) {
      claimGuestReference(db, result.contact, remote.displayId);
      result.contact.remote_created_at = remote.createdAt || null;
      db.persistToDisk('Contacts');
    }
    return result;
  };

  const listPendingContacts = (streamFilter = null) => (
    (db.IN_MEMORY_DB.Contacts || []).filter((c) => {
      if (!c.mobile_signup_pending || c.mobile_signup_confirmed || c.mobile_signup_denied) return false;
      if (!streamFilter) return true;
      const contactStream = c.signup_stream || SIGNUP_STREAMS.BOOTH;
      return contactStream === streamFilter;
    })
  );

  const getPendingMobileSignups = ({ stream = SIGNUP_STREAMS.BOOTH } = {}) => (
    listPendingContacts(stream)
      .sort((a, b) => new Date(b.mobile_signup_at || b.created_at) - new Date(a.mobile_signup_at || a.created_at))
      .slice(0, 30)
      .map(mapPendingSignup)
  );

  const getAllPendingMobileSignups = () => (
    listPendingContacts(null)
      .sort((a, b) => new Date(b.mobile_signup_at || b.created_at) - new Date(a.mobile_signup_at || a.created_at))
      .slice(0, 60)
      .map(mapPendingSignup)
  );

  const confirmMobileSignup = (contactId, kioskLabel = 'Kiosk', staffName = 'Staff') => {
    const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
    if (!contact) throw new Error('Contact not found');

    ensureGuestReference(db, contact);

    contact.mobile_signup_pending = false;
    contact.mobile_signup_confirmed = true;
    contact.mobile_signup_confirmed_at = new Date().toISOString();
    contact.mobile_signup_confirmed_by = kioskLabel;
    contact.mobile_signup_confirmed_by_staff = staffName;
    contact.signup_status = 'approved';
    contact.mobile_signup_denied = false;
    contact.mobile_signup_denied_at = null;
    contact.mobile_signup_denied_by = null;
    contact.mobile_signup_denied_by_staff = null;
    contact.updated_at = contact.mobile_signup_confirmed_at;
    if (contact.signup_stream === SIGNUP_STREAMS.COLOMBIA_RETREAT) {
      markColombiaRetreatInterest(contactId, COLOMBIA_RETREAT_SOURCES.COLOMBIA_QR, staffName);
    }
    db.persistToDisk('Contacts');

    db.IN_MEMORY_DB.StaffLogs.push({
      type: 'MOBILE_SIGNUP_CONFIRM',
      contact_id: contactId,
      contact_name: contact.name,
      guest_reference: contactGuestReference(contact),
      staff_name: staffName,
      timestamp: contact.mobile_signup_confirmed_at,
      source_kiosk: kioskLabel,
    });
    db.persistToDisk('StaffLogs');

    return { success: true, contact, remote_signup_id: contact.remote_signup_id || null };
  };

  const denyMobileSignup = (contactId, kioskLabel = 'Kiosk', staffName = 'Staff') => {
    const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.contact_id === contactId);
    if (!contact) throw new Error('Contact not found');
    if (!contact.mobile_signup_pending || contact.mobile_signup_confirmed) {
      throw new Error('Signup is not pending');
    }

    ensureGuestReference(db, contact);
    const guestRef = contactGuestReference(contact);
    const now = new Date().toISOString();
    const remoteSignupId = contact.remote_signup_id || null;

    if (contact.mobile_signup_is_new && !contact.mobile_signup_confirmed) {
      revertBoothVisitPoints(db, contactId);
    }

    contact.mobile_signup_pending = false;
    contact.mobile_signup_confirmed = false;
    contact.mobile_signup_denied = true;
    contact.mobile_signup_denied_at = now;
    contact.mobile_signup_denied_by = kioskLabel;
    contact.mobile_signup_denied_by_staff = staffName;
    contact.signup_status = 'declined';
    contact.updated_at = now;
    db.persistToDisk('Contacts');

    db.IN_MEMORY_DB.StaffLogs.push({
      type: 'MOBILE_SIGNUP_DENY',
      contact_id: contactId,
      contact_name: contact.name,
      guest_reference: guestRef,
      remote_signup_id: remoteSignupId,
      staff_name: staffName,
      timestamp: now,
      source_kiosk: kioskLabel,
    });
    db.persistToDisk('StaffLogs');

    return { success: true, removed: false, contact, remote_signup_id: remoteSignupId };
  };

  const importDeclinedRemoteSignup = (remote, staffName = 'Staff', kioskLabel = 'Phone Staff Monitor') => {
    if (!remote?.signupId) return null;
    if (isRemoteSignupDenied(db, remote.signupId)) return { success: true, already: true };

    const existingRemote = (db.IN_MEMORY_DB.Contacts || []).find(
      (c) => c.remote_signup_id === remote.signupId
    );
    if (existingRemote) {
      if (!existingRemote.mobile_signup_denied) {
        existingRemote.mobile_signup_pending = false;
        existingRemote.mobile_signup_confirmed = false;
        existingRemote.mobile_signup_denied = true;
        existingRemote.mobile_signup_denied_at = remote.deniedAt || new Date().toISOString();
        existingRemote.mobile_signup_denied_by = remote.deniedByKiosk || kioskLabel;
        existingRemote.mobile_signup_denied_by_staff = remote.deniedByStaff || staffName;
        existingRemote.signup_status = 'declined';
        existingRemote.updated_at = new Date().toISOString();
        const ref = claimGuestReference(db, existingRemote, remote.displayId);
        if (ref) {
          existingRemote.guest_reference = ref;
          existingRemote.mobile_signup_display_id = ref;
        }
        db.persistToDisk('Contacts');
      }
      return { success: true, contact: existingRemote, imported: true };
    }

    const now = remote.deniedAt || new Date().toISOString();
    let contact = findContact(db, remote.email, remote.phone);
    if (contact) {
      contact.mobile_signup_pending = false;
      contact.mobile_signup_confirmed = false;
      contact.mobile_signup_denied = true;
      contact.mobile_signup_denied_at = now;
      contact.mobile_signup_denied_by = remote.deniedByKiosk || kioskLabel;
      contact.mobile_signup_denied_by_staff = remote.deniedByStaff || staffName;
      contact.signup_status = 'declined';
      contact.remote_signup_id = remote.signupId;
      const ref = claimGuestReference(db, contact, remote.displayId);
      if (ref) {
        contact.guest_reference = ref;
        contact.mobile_signup_display_id = ref;
      } else {
        ensureGuestReference(db, contact);
      }
      contact.remote_created_at = remote.createdAt || null;
      contact.updated_at = now;
      db.persistToDisk('Contacts');
    } else {
      const fn = remote.firstName || 'Guest';
      const ln = remote.lastName || '';
      const maxId = (db.IN_MEMORY_DB.Contacts || []).reduce(
        (max, item) => Math.max(max, item.contact_id || 0),
        0
      );
      contact = {
        contact_id: maxId + 1,
        name: `${fn} ${ln}`.trim(),
        first_name: fn,
        last_name: ln,
        email: normalizeEmail(remote.email),
        phone: normalizePhone(remote.phone),
        physical_tickets: [],
        is_vip: false,
        total_points: 0,
        flower_claimed: false,
        signup_source: 'mobile_qr',
        signup_status: 'declined',
        mobile_signup_pending: false,
        mobile_signup_confirmed: false,
        mobile_signup_denied: true,
        mobile_signup_denied_at: now,
        mobile_signup_denied_by: remote.deniedByKiosk || kioskLabel,
        mobile_signup_denied_by_staff: remote.deniedByStaff || staffName,
        mobile_signup_is_new: true,
        mobile_signup_at: remote.createdAt || now,
        remote_signup_id: remote.signupId,
        remote_created_at: remote.createdAt || null,
        source_kiosk: 'Mobile QR',
        created_at: remote.createdAt || now,
      };
      claimGuestReference(db, contact, remote.displayId);
      db.IN_MEMORY_DB.Contacts.push(contact);
      db.persistToDisk('Contacts');
    }

    db.IN_MEMORY_DB.StaffLogs.push({
      type: 'MOBILE_SIGNUP_DENY',
      contact_id: contact.contact_id,
      contact_name: contact.name,
      guest_reference: contactGuestReference(contact),
      remote_signup_id: remote.signupId,
      staff_name: remote.deniedByStaff || staffName,
      timestamp: now,
      source_kiosk: remote.deniedByKiosk || kioskLabel,
    });
    db.persistToDisk('StaffLogs');

    return { success: true, contact, imported: true };
  };

  const confirmByRemoteSignupId = (remoteSignupId, staffName = 'Staff', kioskLabel = 'Phone Staff Monitor') => {
    const contact = (db.IN_MEMORY_DB.Contacts || []).find(
      (c) => c.remote_signup_id === remoteSignupId && c.mobile_signup_pending && !c.mobile_signup_confirmed
    );
    if (!contact) return null;
    return confirmMobileSignup(contact.contact_id, kioskLabel, staffName);
  };

  const importConfirmedRemoteSignup = (remote, staffName = 'Staff', kioskLabel = 'Phone Staff Monitor') => {
    if (!remote?.signupId) return null;

    const existing = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.remote_signup_id === remote.signupId);
    if (existing) {
      if (existing.mobile_signup_confirmed) return { success: true, already: true, contact: existing };
      if (existing.mobile_signup_denied || existing.signup_status === 'declined') {
        return { success: true, skipped: true, contact: existing };
      }
      const result = confirmMobileSignup(
        existing.contact_id,
        remote.confirmedByKiosk || kioskLabel,
        remote.confirmedByStaff || staffName
      );
      return { ...result, imported: true };
    }

    const importResult = importRemoteSignup(remote);
    if (importResult?.skipped) return null;

    const contact = (db.IN_MEMORY_DB.Contacts || []).find((c) => c.remote_signup_id === remote.signupId);
    if (!contact) return null;

    const result = confirmMobileSignup(
      contact.contact_id,
      remote.confirmedByKiosk || kioskLabel,
      remote.confirmedByStaff || staffName
    );
    return { ...result, imported: true };
  };

  const getContactsNeedingRelayConfirm = () => (
    (db.IN_MEMORY_DB.Contacts || [])
      .filter((c) => c.remote_signup_id && c.mobile_signup_confirmed && !c.mobile_signup_denied)
      .map((c) => ({
        remoteSignupId: c.remote_signup_id,
        staffName: c.mobile_signup_confirmed_by_staff || 'Staff',
        kioskLabel: c.mobile_signup_confirmed_by || 'Kiosk',
        displayId: contactGuestReference(c),
      }))
  );

  const getContactsNeedingRelayDeny = () => (
    (db.IN_MEMORY_DB.Contacts || [])
      .filter((c) => c.remote_signup_id && c.mobile_signup_denied && !c.mobile_signup_confirmed)
      .map((c) => ({
        remoteSignupId: c.remote_signup_id,
        staffName: c.mobile_signup_denied_by_staff || 'Staff',
        kioskLabel: c.mobile_signup_denied_by || 'Kiosk',
        displayId: contactGuestReference(c),
      }))
  );

  const denyByRemoteSignupId = (remoteSignupId, staffName = 'Staff', kioskLabel = 'Phone Staff Monitor', remoteData = null) => {
    const contact = (db.IN_MEMORY_DB.Contacts || []).find(
      (c) => c.remote_signup_id === remoteSignupId && c.mobile_signup_pending && !c.mobile_signup_confirmed
    );
    if (contact) return denyMobileSignup(contact.contact_id, kioskLabel, staffName);
    if (remoteData) return importDeclinedRemoteSignup({ ...remoteData, signupId: remoteSignupId }, staffName, kioskLabel);
    return recordRemoteSignupDenial(remoteSignupId, staffName, kioskLabel, remoteData?.displayId || null);
  };

  return {
    registerMobileSignup,
    importRemoteSignup,
    importDeclinedRemoteSignup,
    importConfirmedRemoteSignup,
    getPendingMobileSignups,
    getAllPendingMobileSignups,
    confirmMobileSignup,
    denyMobileSignup,
    confirmByRemoteSignupId,
    denyByRemoteSignupId,
    getContactsNeedingRelayConfirm,
    getContactsNeedingRelayDeny,
    ensureGuestReference: (contact) => ensureGuestReference(db, contact),
    markColombiaRetreatInterest,
    recordRemoteSignupDenial,
    isRemoteSignupDenied: (remoteSignupId) => isRemoteSignupDenied(db, remoteSignupId),
  };
}
