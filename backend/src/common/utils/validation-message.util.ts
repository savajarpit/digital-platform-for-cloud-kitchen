/** class-validator prefixes nested errors with their path ("items.0.",
 * "address."). That's useful context for its own lowercase default messages
 * ("items.0.quantity must not be less than 1"), but noise in front of a
 * hand-written sentence ("items.0.You can order at most 50…"). Strip the
 * path only when a capitalised sentence follows it. */
export function cleanValidationMessage(message: string): string {
  return message.replace(/^(?:[A-Za-z_$][\w$]*\.|\d+\.)+(?=[A-Z])/, '');
}
