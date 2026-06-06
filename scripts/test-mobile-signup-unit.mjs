/** Quick unit test: phone approve reconciliation into local DB */
import { createMobileSignupHandlers } from '../src/mobileSignup.js';

const db = {
  IN_MEMORY_DB: {
    Contacts: [],
    Actions: [{ action_id: 1, action_name: 'Booth Visit', points_awarded: 10 }],
    UserActions: [],
    StaffLogs: [],
  },
  persistToDisk() {},
};

const handlers = createMobileSignupHandlers(db);

handlers.importRemoteSignup({
  signupId: 'remote-abc',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '5559876543',
});

const pending = handlers.getPendingMobileSignups();
if (pending.length !== 1) throw new Error(`Expected 1 pending, got ${pending.length}`);

const result = handlers.confirmByRemoteSignupId('remote-abc', 'Alice', 'Phone Staff Monitor');
if (!result?.success) throw new Error('confirmByRemoteSignupId failed');

const after = handlers.getPendingMobileSignups();
if (after.length !== 0) throw new Error(`Expected 0 pending after confirm, got ${after.length}`);

const contact = db.IN_MEMORY_DB.Contacts[0];
if (!contact.mobile_signup_confirmed) throw new Error('Contact not marked confirmed');
if (contact.mobile_signup_confirmed_by_staff !== 'Alice') throw new Error('Staff name not saved');

console.log('✓ confirmByRemoteSignupId reconciliation OK');

handlers.importRemoteSignup({
  signupId: 'remote-decline',
  firstName: 'No',
  lastName: 'Show',
  email: 'noshow@example.com',
  phone: '5552110000',
  displayId: 'CND-00999',
});

const pendingBeforeDeny = handlers.getPendingMobileSignups();
if (pendingBeforeDeny.length !== 1) throw new Error(`Expected 1 pending before deny, got ${pendingBeforeDeny.length}`);

const denyResult = handlers.denyMobileSignup(pendingBeforeDeny[0].contact_id, 'Kiosk', 'Bob');
if (denyResult.removed) throw new Error('Declined signup should not be removed from Contacts');

if (db.IN_MEMORY_DB.Contacts.length !== 2) throw new Error(`Expected contacts kept after deny, got ${db.IN_MEMORY_DB.Contacts.length}`);

const declined = db.IN_MEMORY_DB.Contacts.find((c) => c.email === 'noshow@example.com');
if (!declined.mobile_signup_denied) throw new Error('Contact not marked declined');
if (declined.signup_status !== 'declined') throw new Error('signup_status not declined');

if (handlers.getPendingMobileSignups().length !== 0) throw new Error('Declined signup should not stay in pending queue');

const importedDeclined = handlers.importDeclinedRemoteSignup({
  signupId: 'remote-phone-deny',
  firstName: 'Phone',
  lastName: 'Only',
  email: 'phoneonly@example.com',
  phone: '5552220000',
  displayId: 'CND-01000',
  deniedAt: new Date().toISOString(),
  deniedByStaff: 'Alice',
  deniedByKiosk: 'Phone Staff Monitor',
});
if (!importedDeclined?.imported) throw new Error('importDeclinedRemoteSignup failed');
if (db.IN_MEMORY_DB.Contacts.length !== 3) throw new Error(`Expected 3 contacts after phone deny import, got ${db.IN_MEMORY_DB.Contacts.length}`);

console.log('✓ deny keeps contact in attendee DB OK');

const resurrect = handlers.importRemoteSignup({
  signupId: 'remote-decline',
  firstName: 'No',
  lastName: 'Show',
  email: 'noshow@example.com',
  phone: '5552110000',
  displayId: 'CND-00999',
});
if (resurrect?.imported || resurrect?.pending) throw new Error('Declined signup must not re-enter pending queue');
if (handlers.getPendingMobileSignups().length !== 0) throw new Error('Declined signup resurrected in pending queue');

console.log('✓ declined signup stays out of pending queue OK');

handlers.importConfirmedRemoteSignup({
  signupId: 'remote-phone-approve',
  firstName: 'Early',
  lastName: 'Approve',
  email: 'early@example.com',
  phone: '5553330000',
  displayId: 'CND-01001',
  confirmedAt: new Date().toISOString(),
  confirmedByStaff: 'Phone Staff',
  confirmedByKiosk: 'Phone Staff Monitor',
});
if (handlers.getPendingMobileSignups().length !== 0) throw new Error('Phone-approved import should not stay pending');
const approvedEarly = db.IN_MEMORY_DB.Contacts.find((c) => c.email === 'early@example.com');
if (!approvedEarly?.mobile_signup_confirmed) throw new Error('Phone-approved import should be confirmed locally');

console.log('✓ importConfirmedRemoteSignup OK');
