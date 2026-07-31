import { SetMetadata } from '@nestjs/common';

export const SKIP_PLATFORM_TERMS_KEY = 'skipPlatformTerms';

/**
 * Exempts a route from PlatformTermsGuard — needed for the handful of
 * endpoints an OWNER must still be able to reach while their acceptance is
 * stale (reading the current terms, submitting acceptance, logging out).
 */
export const SkipPlatformTerms = () =>
  SetMetadata(SKIP_PLATFORM_TERMS_KEY, true);
