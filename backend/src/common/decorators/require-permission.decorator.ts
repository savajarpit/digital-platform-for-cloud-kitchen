import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Fine-grained permission check, layered on top of @Roles(). @Roles() is
 * still the coarse gate (keeps CUSTOMER/DELIVERY out entirely); this
 * decorator additionally requires the caller's role to have this specific
 * permission granted for their tenant — configurable per-tenant by
 * SUPER_ADMIN via RolePermission. SUPER_ADMIN always bypasses this check.
 */
export const RequirePermission = (key: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, key);
