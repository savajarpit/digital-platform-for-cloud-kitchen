import { BadRequestException } from '@nestjs/common';
import { assertRefundAmount } from './refund-amount.util';

describe('assertRefundAmount', () => {
  it('allows a full or partial refund', () => {
    expect(() => assertRefundAmount(24410, 0, 24410)).not.toThrow();
    expect(() => assertRefundAmount(10000, 2500, 24410)).not.toThrow();
    expect(() => assertRefundAmount(0, 0, 24410)).not.toThrow();
  });

  it('rejects more than was paid', () => {
    expect(() => assertRefundAmount(24411, 0, 24410)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a fee larger than the refund', () => {
    expect(() => assertRefundAmount(1000, 1001, 24410)).toThrow(
      BadRequestException,
    );
  });
});
