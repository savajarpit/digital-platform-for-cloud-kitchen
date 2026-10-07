import { Role, type User } from '../../generated/prisma';

export const REMOVED_ACCOUNT_EMAIL_MESSAGE =
  'This email belonged to an account that was removed — use a different email.';

/** Why a new account can't use this email, or null when it's free.
 * `taken` is the existing user (removed ones included). */
export function emailTakenMessage(
  taken: Pick<User, 'role' | 'deletedAt'> | null,
  context: 'customer' | 'signup' | 'staff',
): string | null {
  if (!taken) return null;
  if (taken.deletedAt) return REMOVED_ACCOUNT_EMAIL_MESSAGE;
  if (context === 'customer') {
    return taken.role === Role.CUSTOMER
      ? 'A customer with this email already exists — search for them instead.'
      : 'This email belongs to a staff account here — use a different email for the customer.';
  }
  return 'Email already in use';
}
