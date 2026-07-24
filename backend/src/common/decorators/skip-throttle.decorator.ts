import { SetMetadata } from '@nestjs/common';

export const THROTTLER_SKIP = 'throttler:skip';
export const SkipThrottle = () => SetMetadata(THROTTLER_SKIP, true);
