/**
 * India-only mobile number in E.164: "+91" followed by 10 digits, the first
 * of which must be 6-9 (the range Indian mobile numbers are allocated from).
 * This platform only serves Indian numbers, so the frontend's phone inputs
 * never produce anything outside this shape — validation here just holds
 * that contract server-side too.
 */
export const INDIA_PHONE_REGEX = /^\+91[6-9]\d{9}$/;
export const INDIA_PHONE_MESSAGE =
  'Enter a valid 10-digit Indian mobile number';
