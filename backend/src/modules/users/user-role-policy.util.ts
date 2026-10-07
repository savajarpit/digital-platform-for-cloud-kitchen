import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

export interface RoleActor {
  userId: string;
  role: string;
}

/** Roles that grant control over a whole business (or the platform). Only
 * the platform admin hands these out — same "no escalation" rule as GitHub,
 * where you can't grant a permission level above your own. */
const PRIVILEGED_ROLES: ReadonlySet<string> = new Set([
  Role.SUPER_ADMIN,
  Role.OWNER,
]);

export function isPrivilegedRole(role: string): boolean {
  return PRIVILEGED_ROLES.has(role);
}

/** An owner may assign STAFF / DELIVERY / CUSTOMER; only SUPER_ADMIN may
 * assign OWNER or SUPER_ADMIN. */
export function assertCanAssignRole(actorRole: string, role: string): void {
  if (isPrivilegedRole(role) && actorRole !== Role.SUPER_ADMIN) {
    throw new ForbiddenException(
      'Only the platform admin can assign the owner or platform admin role.',
    );
  }
}

/** Guards PATCH /users/:id. An owner can't edit another owner or a platform
 * admin, and nobody can change their own role (an owner would otherwise be
 * able to demote themselves and lock the business out). */
export function assertCanUpdateUser(
  actor: RoleActor,
  target: { id: string; role: string },
  newRole: string | undefined,
): void {
  const isSelf = actor.userId === target.id;
  if (
    !isSelf &&
    isPrivilegedRole(target.role) &&
    actor.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenException(
      "An owner's account can only be changed by the platform admin.",
    );
  }
  if (newRole === undefined || newRole === target.role) return;
  if (isSelf) {
    throw new ForbiddenException("You can't change your own role.");
  }
  assertCanAssignRole(actor.role, newRole);
}
