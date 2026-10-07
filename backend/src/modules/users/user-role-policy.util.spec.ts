import { ForbiddenException } from '@nestjs/common';
import {
  assertCanAssignRole,
  assertCanUpdateUser,
} from './user-role-policy.util';

const owner = { userId: 'owner-1', role: 'OWNER' };
const superAdmin = { userId: 'sa-1', role: 'SUPER_ADMIN' };

describe('assertCanAssignRole', () => {
  it.each(['STAFF', 'DELIVERY', 'CUSTOMER'])(
    'lets an owner assign %s',
    (role) => {
      expect(() => assertCanAssignRole('OWNER', role)).not.toThrow();
    },
  );

  it.each(['OWNER', 'SUPER_ADMIN'])('refuses an owner assigning %s', (role) => {
    expect(() => assertCanAssignRole('OWNER', role)).toThrow(
      ForbiddenException,
    );
  });

  it.each(['OWNER', 'SUPER_ADMIN', 'STAFF'])(
    'lets the platform admin assign %s',
    (role) => {
      expect(() => assertCanAssignRole('SUPER_ADMIN', role)).not.toThrow();
    },
  );
});

describe('assertCanUpdateUser', () => {
  it('lets an owner promote a customer to staff', () => {
    expect(() =>
      assertCanUpdateUser(owner, { id: 'u1', role: 'CUSTOMER' }, 'STAFF'),
    ).not.toThrow();
  });

  it('refuses an owner promoting staff to owner', () => {
    expect(() =>
      assertCanUpdateUser(owner, { id: 'u1', role: 'STAFF' }, 'OWNER'),
    ).toThrow('Only the platform admin');
  });

  it('refuses an owner making themselves platform admin', () => {
    expect(() =>
      assertCanUpdateUser(
        owner,
        { id: 'owner-1', role: 'OWNER' },
        'SUPER_ADMIN',
      ),
    ).toThrow("You can't change your own role.");
  });

  it('refuses the platform admin changing their own role too', () => {
    expect(() =>
      assertCanUpdateUser(
        superAdmin,
        { id: 'sa-1', role: 'SUPER_ADMIN' },
        'OWNER',
      ),
    ).toThrow("You can't change your own role.");
  });

  it('allows a self-edit that leaves the role as it is', () => {
    expect(() =>
      assertCanUpdateUser(owner, { id: 'owner-1', role: 'OWNER' }, 'OWNER'),
    ).not.toThrow();
    expect(() =>
      assertCanUpdateUser(owner, { id: 'owner-1', role: 'OWNER' }, undefined),
    ).not.toThrow();
  });

  it("refuses an owner editing another owner's account at all", () => {
    expect(() =>
      assertCanUpdateUser(owner, { id: 'owner-2', role: 'OWNER' }, undefined),
    ).toThrow("An owner's account can only be changed by the platform admin.");
  });

  it('refuses an owner demoting a platform admin', () => {
    expect(() =>
      assertCanUpdateUser(owner, { id: 'sa-1', role: 'SUPER_ADMIN' }, 'STAFF'),
    ).toThrow(ForbiddenException);
  });

  it('lets the platform admin make someone an owner', () => {
    expect(() =>
      assertCanUpdateUser(superAdmin, { id: 'u1', role: 'STAFF' }, 'OWNER'),
    ).not.toThrow();
  });
});
