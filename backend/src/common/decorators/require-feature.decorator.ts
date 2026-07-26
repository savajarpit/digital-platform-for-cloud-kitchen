import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Tenant-level entitlement check, independent of @RequirePermission (a route
 * can require both). SUPER_ADMIN always bypasses, so Arpit can preview/manage
 * a feature before enabling it for anyone.
 */
export const RequireFeature = (key: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, key);
