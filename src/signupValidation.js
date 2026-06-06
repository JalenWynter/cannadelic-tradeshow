/** Signup field validation (kiosk + shared rules with relay) */

export const LIMITS = {
  firstNameMax: 40,
  lastNameMax: 40,
  emailMax: 254,
  phoneDigits: 10,
  phoneMinDigits: 10,
  phoneMaxDigits: 10,
};

/** NANP: area code & exchange cannot start with 0 or 1 */
export const US_PHONE_RE = /^[2-9]\d{2}[2-9]\d{6}$/;

const NAME_RE = /^[\p{L}\p{M}' .-]+$/u;

export function normalizeEmail(email) {
  return email ? email.toLowerCase().trim() : '';
}

export function normalizePhone(phone) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.slice(0, LIMITS.phoneMaxDigits);
}

export function isValidUsPhone(digits) {
  return US_PHONE_RE.test(normalizePhone(digits));
}

export function usPhoneValidationError(phone) {
  const p = normalizePhone(phone);
  if (!p) return null;
  if (p.length < LIMITS.phoneMinDigits) {
    return `Enter a ${LIMITS.phoneDigits}-digit US phone number`;
  }
  if (p.length > LIMITS.phoneMaxDigits) {
    return `Phone must be exactly ${LIMITS.phoneDigits} digits`;
  }
  if (!isValidUsPhone(p)) {
    return 'Enter a valid US phone number (area code cannot start with 0 or 1)';
  }
  return null;
}

export function validateSignupFields({ firstName, lastName, email, phone }) {
  const errors = [];
  const fn = firstName?.trim() || '';
  const ln = lastName?.trim() || '';
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);

  if (!fn) errors.push('First name is required');
  if (fn.length > LIMITS.firstNameMax) errors.push(`First name must be ${LIMITS.firstNameMax} characters or less`);
  if (fn && !NAME_RE.test(fn)) errors.push('First name contains invalid characters');
  if (ln.length > LIMITS.lastNameMax) errors.push(`Last name must be ${LIMITS.lastNameMax} characters or less`);
  if (ln && !NAME_RE.test(ln)) errors.push('Last name contains invalid characters');
  if (!e && !p) errors.push('Email or phone is required');
  if (e && e.length > LIMITS.emailMax) errors.push('Email is too long');
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) errors.push('Invalid email address');
  const phoneErr = usPhoneValidationError(p || phone);
  if (phoneErr) errors.push(phoneErr);

  if (errors.length) throw new Error(errors[0]);

  return { firstName: fn, lastName: ln, email: e, phone: p };
}
