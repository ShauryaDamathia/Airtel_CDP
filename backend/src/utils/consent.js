'use strict';

const pg = require('../db/postgres');

/**
 * Check if a customer has granted consent for a given purpose.
 * Fail-closed: returns FALSE if no record exists (DPDP / GDPR default-deny).
 */
async function hasConsent(customerId, purpose) {
  const result = await pg.query(
    'SELECT granted FROM consents WHERE customer_id = $1 AND purpose = $2',
    [customerId, purpose]
  );
  if (!result.rows.length) return false;
  return result.rows[0].granted === true;
}

/**
 * Filter an array of customer IDs to only those who have granted
 * consent for the given purpose.
 */
async function filterByConsent(customerIds, purpose) {
  if (!customerIds || customerIds.length === 0) return [];
  const result = await pg.query(
    `SELECT customer_id FROM consents
     WHERE customer_id = ANY($1)
       AND purpose = $2
       AND granted = TRUE`,
    [customerIds, purpose]
  );
  return result.rows.map(r => r.customer_id);
}

module.exports = { hasConsent, filterByConsent };
