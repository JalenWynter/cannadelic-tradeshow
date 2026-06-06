import {
  claimGuestReference,
  contactDisplayReference,
  ensureGuestReference,
  isValidGuestReference,
  normalizeGuestReference,
  nextLocalDisplayId,
  reconcileAllGuestReferences,
} from '../src/guestReference.js';

if (normalizeGuestReference('cnd-00007') !== 'CND-00007') throw new Error('normalize failed');
if (normalizeGuestReference('83565343') !== null) throw new Error('raw number must not normalize');
if (!isValidGuestReference('CND-00007')) throw new Error('valid CND ref rejected');
if (isValidGuestReference('83565343', { phone: '8383565343' })) throw new Error('phone-like ref accepted');

const db = {
  IN_MEMORY_DB: {
    Contacts: [
      { contact_id: 1, guest_reference: 'CND-00006', phone: '7275551234' },
      { contact_id: 2, guest_reference: '83565343', phone: '8383565343' },
    ],
  },
  persistToDisk() {},
};

if (nextLocalDisplayId(db.IN_MEMORY_DB.Contacts) !== 'CND-00007') throw new Error('next id wrong');

const bad = db.IN_MEMORY_DB.Contacts[1];
const ref = ensureGuestReference(db, bad);
if (ref !== 'CND-00007') throw new Error(`ensure should assign CND-00007, got ${ref}`);
if (contactDisplayReference(bad) !== ref) throw new Error('ensure should persist valid ref');
if (!bad.guest_reference_prehistoric) throw new Error('prehistoric contact should be labeled');
if (bad.legacy_guest_reference !== '83565343') throw new Error('legacy ref not preserved');

db.IN_MEMORY_DB.Contacts.push({ contact_id: 3, guest_reference: 'CND-00006', phone: '5551112222' });
const repaired = reconcileAllGuestReferences(db);
if (repaired < 1) throw new Error('reconcile should fix duplicate CND-00006');
const refs = db.IN_MEMORY_DB.Contacts.map((c) => contactDisplayReference(c)).filter(Boolean);
if (new Set(refs).size !== refs.length) throw new Error('duplicate refs remain after reconcile');

const remoteContact = { contact_id: 4, phone: '5553334444', remote_signup_id: 'remote-1' };
claimGuestReference(db, remoteContact, 'CND-00006');
if (contactDisplayReference(remoteContact) !== 'CND-00006') throw new Error('relay signup should keep desired ref when allowed');

console.log('✓ guest reference helpers OK');
