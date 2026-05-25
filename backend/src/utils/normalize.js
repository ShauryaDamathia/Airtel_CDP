'use strict';

/**
 * Normalize an email address.
 * - Trim + lowercase
 * - Gmail/Googlemail: remove dots in local part, strip plus-alias
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const atIdx = trimmed.lastIndexOf('@');
  if (atIdx < 1) return trimmed; // malformed — return as-is

  let local  = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.split('+')[0]; // strip plus-alias
    local = local.replace(/\./g, ''); // remove dots
  }

  return `${local}@${domain}`;
}

/**
 * Normalize a phone number to +91XXXXXXXXXX format.
 *
 * Examples that all resolve to +919810000001:
 *   9810000001, 09810000001, +91 98100 00001, 91-9810-000001, +919810000001
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  // 10 digits → prepend +91
  if (digits.length === 10) return `+91${digits}`;

  // 11 digits starting with 0 → replace leading 0 with +91
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;

  // 12 digits starting with 91 → prepend +
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;

  // Already in correct form or unknown — best-effort
  if (digits.length > 12) return `+${digits}`;
  return `+91${digits}`;
}

/**
 * Normalize a name: trim and collapse internal whitespace.
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return null;
  return name.trim().replace(/\s+/g, ' ') || null;
}

/**
 * Normalize all identity fields at once. Returns a new object.
 */
function normalizeIdentifiers({ user_id, email, phone, first_name, last_name } = {}) {
  return {
    user_id:    user_id    ? String(user_id).trim() || null : null,
    email:      normalizeEmail(email),
    phone:      normalizePhone(phone),
    first_name: normalizeName(first_name),
    last_name:  normalizeName(last_name)
  };
}

module.exports = { normalizeEmail, normalizePhone, normalizeName, normalizeIdentifiers };
