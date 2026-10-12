import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizePartner, authorizeCustomerResource, authorizeAdmin } from '../shared/partner-access.js';

const owner = {
  authenticated: true, id: 'user-a',
  memberships: [{ providerId: 'provider-1', userId: 'user-a', role: 'OWNER', active: true }]
};
const viewer = {
  authenticated: true, id: 'user-b',
  memberships: [{ providerId: 'provider-1', userId: 'user-b', role: 'VIEWER', active: true }]
};

test('partner only has its verified provider scope', () => {
  assert.equal(authorizePartner({ principal: owner, providerId: 'provider-1', action: 'quote.create' }), true);
  assert.equal(authorizePartner({ principal: owner, providerId: 'provider-2', action: 'quote.create' }), false);
  assert.equal(authorizePartner({ principal: owner, providerId: 'provider-2', action: 'booking.read' }), false);
});

test('partner read and write capability differs by role', () => {
  assert.equal(authorizePartner({ principal: viewer, providerId: 'provider-1', action: 'booking.read' }), true);
  assert.equal(authorizePartner({ principal: viewer, providerId: 'provider-1', action: 'quote.create' }), false);
  assert.equal(authorizePartner({ principal: viewer, providerId: 'provider-1', action: 'member.invite' }), false);
  assert.equal(authorizePartner({ principal: owner, providerId: 'provider-1', action: 'member.invite' }), true);
});

test('no session, revoked membership, or membership for different actor is rejected', () => {
  assert.equal(authorizePartner({ principal: { ...owner, authenticated: false }, providerId: 'provider-1', action: 'booking.read' }), false);
  assert.equal(authorizePartner({ principal: { ...owner, memberships: [{ ...owner.memberships[0], active: false }] }, providerId: 'provider-1', action: 'booking.read' }), false);
  assert.equal(authorizePartner({ principal: { ...owner, id: 'attacker' }, providerId: 'provider-1', action: 'booking.read' }), false);
  assert.equal(authorizePartner({ principal: owner, providerId: 'provider-1', action: 'admin.users' }), false);
  assert.equal(authorizePartner({ principal: owner, providerId: '', action: 'quote.create' }), false);
});

test('resource owner only, never infer ownership from an untrusted resource ID', () => {
  assert.equal(authorizeCustomerResource({ principal: { authenticated: true, id: 'customer-a' }, resourceOwnerId: 'customer-a' }), true);
  assert.equal(authorizeCustomerResource({ principal: { authenticated: true, id: 'customer-a' }, resourceOwnerId: 'customer-b' }), false);
  assert.equal(authorizeCustomerResource({ principal: { authenticated: false, id: 'customer-a' }, resourceOwnerId: 'customer-a' }), false);
});

test('admin active + freshly verified sensitive actions', () => {
  const admin = { authenticated: true, id: 'admin-a', role: 'ADMIN', active: true, mfaVerified: false };
  assert.equal(authorizeAdmin({ principal: admin, action: 'dashboard.read' }), true);
  assert.equal(authorizeAdmin({ principal: admin, action: 'finance.payout' }), false);
  assert.equal(authorizeAdmin({ principal: { ...admin, mfaVerified: true }, action: 'finance.payout' }), true);
  assert.equal(authorizeAdmin({ principal: { ...admin, active: false }, action: 'dashboard.read' }), false);
  assert.equal(authorizeAdmin({ principal: { ...admin, role: 'MANAGER' }, action: 'dashboard.read' }), false);
});
