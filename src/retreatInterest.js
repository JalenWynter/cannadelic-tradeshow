/** Colombia retreat interest — source slugs and helpers */

export const COLOMBIA_RETREAT_SOURCES = {
  KIOSK_EARLY_BIRD: 'kiosk_early_bird',
  COLOMBIA_QR: 'colombia_qr',
  HOME_ONE_TAP: 'home_one_tap',
  PROFILE_WAITLIST: 'profile_waitlist',
};

export const SIGNUP_STREAMS = {
  BOOTH: 'booth',
  COLOMBIA_RETREAT: 'colombia_retreat',
};

export function defaultColombiaEventId(mainEventId) {
  const base = String(mainEventId || 'event').trim();
  if (base.startsWith('colombia-retreat-')) return base;
  return `colombia-retreat-${base}`;
}

export function isColombiaRetreatEventId(eventId) {
  return String(eventId || '').includes('colombia-retreat');
}

export function signupStreamForEventId(eventId) {
  return isColombiaRetreatEventId(eventId) ? SIGNUP_STREAMS.COLOMBIA_RETREAT : SIGNUP_STREAMS.BOOTH;
}

export function displayPrefixForEventId(eventId) {
  if (isColombiaRetreatEventId(eventId)) return 'COL';
  if (String(eventId || '').includes('cannadelic')) return 'CND';
  return 'GE';
}

export function isColombiaRetreatInterested(contact) {
  if (!contact) return false;
  return Boolean(contact.colombia_retreat_interest);
}

export function colombiaRetreatSourceLabel(source) {
  switch (source) {
    case COLOMBIA_RETREAT_SOURCES.KIOSK_EARLY_BIRD:
      return 'Early Bird (kiosk)';
    case COLOMBIA_RETREAT_SOURCES.COLOMBIA_QR:
      return 'Colombia QR';
    case COLOMBIA_RETREAT_SOURCES.HOME_ONE_TAP:
      return 'Home one-tap';
    case COLOMBIA_RETREAT_SOURCES.PROFILE_WAITLIST:
      return 'Profile waitlist';
    default:
      return source || 'Retreat interest';
  }
}
