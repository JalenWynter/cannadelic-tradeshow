import {
  contactDisplayReference,
  ensureGuestReference,
  isValidGuestReference,
  normalizeGuestReference,
  nextLocalDisplayId,
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

console.log('✓ guest reference helpers OK');
