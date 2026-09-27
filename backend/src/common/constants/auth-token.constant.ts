/** Redis key prefixes for the one-time tokens that let someone set a
 * password without knowing the current one. Both are consumed by
 * AuthService.resetPassword — an invite is just a longer-lived reset. */
export const PASSWORD_RESET_KEY_PREFIX = 'password-reset:';
export const ACCOUNT_INVITE_KEY_PREFIX = 'account-invite:';

/** userId → the currently valid invite token, so a resend can revoke the
 * previous link and the admin UI can show "invite pending". */
export const ACCOUNT_INVITE_USER_KEY_PREFIX = 'account-invite-user:';

export const ACCOUNT_INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;
