import { cleanValidationMessage } from './validation-message.util';

describe('cleanValidationMessage', () => {
  it.each([
    [
      'items.0.You can order at most 50 of an item at a time.',
      'You can order at most 50 of an item at a time.',
    ],
    [
      'items.0.addons.0.An add-on can be added at most 20 times per item.',
      'An add-on can be added at most 20 times per item.',
    ],
    [
      'address.Enter a valid 10-digit Indian mobile number',
      'Enter a valid 10-digit Indian mobile number',
    ],
  ])('strips the path before a sentence: %s', (input, expected) => {
    expect(cleanValidationMessage(input)).toBe(expected);
  });

  it.each([
    'items.0.quantity must not be less than 1',
    'property role should not exist',
    'Invalid coupon code',
    'A customer with this email already exists — search for them instead.',
  ])('leaves other messages untouched: %s', (input) => {
    expect(cleanValidationMessage(input)).toBe(input);
  });
});
