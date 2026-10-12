/**
 * KORUAL proposed shared authorization boundary.
 *
 * NOT a drop-in substitute for API authorization: `principal` and membership
 * records MUST be resolved by a trusted server from a verified session.
 * Never accept role, membership, user ID or provider ID ownership from a client.
 * This module is not wired to production routes.
 */
export const APP_KIND = Object.freeze({
  CUSTOMER: 'customer',
  PARTNER: 'partner',
  ADMIN: 'admin'
});

export const PARTNER_ROLE = Object.freeze({
  OWNER: 'OWNER',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER'
});

const READ_ACTIONS = new Set(['lead.read', 'quote.read', 'booking.read', 'payout.read']);
const WRITE_ACTIONS = new Set(['quote.create', 'quote.update', 'booking.confirm', 'service.update']);
const OWNER_ACTIONS = new Set(['member.invite', 'member.revoke', 'business.update']);

/**
 * Match a provider scope by exact UUID/string equality. A single user can have
 * multiple memberships; no membership grants access across providers.
 */
export function authorizePartner({ principal, providerId, action }) {
  if (!principal?.authenticated || !principal.id || !providerId || !action) return false;
  if (!READ_ACTIONS.has(action) && !WRITE_ACTIONS.has(action) && !OWNER_ACTIONS.has(action)) return false;
  const membership = (Array.isArray(principal.memberships) ? principal.memberships : [])
    .find(m => m && m.providerId === providerId && m.userId === principal.id && m.active === true);
  if (!membership) return false;
  if (READ_ACTIONS.has(action)) {
    return Object.values(PARTNER_ROLE).includes(membership.role);
  }
  if (WRITE_ACTIONS.has(action)) {
    return membership.role === PARTNER_ROLE.OWNER || membership.role === PARTNER_ROLE.OPERATOR;
  }
  return membership.role === PARTNER_ROLE.OWNER;
}

/**
 * Customer reads must be owned by the verified account; guest sessions require
 * a separate server-controlled session scope, not just possession of an ID.
 */
export function authorizeCustomerResource({ principal, resourceOwnerId }) {
  return Boolean(principal?.authenticated && principal.id && resourceOwnerId && principal.id === resourceOwnerId);
}

/** Admin roles must come from a freshly checked server profile, not JWT user_metadata. */
export function authorizeAdmin({ principal, action }) {
  if (!principal?.authenticated || principal.role !== 'ADMIN' || principal.active !== true) return false;
  if (!action) return false;
  const highRisk = new Set(['finance.payout', 'refund.approve', 'account.change_role', 'provider.suspend']);
  const allowed = new Set(['dashboard.read', 'partner.review', ...highRisk]);
  if (!allowed.has(action)) return false;
  // Strong verification is required when approving monetary or high-risk changes.
  return !highRisk.has(action) || principal.mfaVerified === true;
}
