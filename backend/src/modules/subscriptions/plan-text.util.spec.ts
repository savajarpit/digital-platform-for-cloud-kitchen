import { BadRequestException } from '@nestjs/common';
import { normalizePlanText } from './plan-text.util';

describe('normalizePlanText', () => {
  it('trims the name, nulls a blank description and drops blank features', () => {
    expect(
      normalizePlanText({
        name: '  Weight Loss  ',
        description: '   ',
        features: [' Free delivery ', '', '   ', 'Skip anytime'],
      }),
    ).toEqual({
      name: 'Weight Loss',
      description: null,
      features: ['Free delivery', 'Skip anytime'],
    });
  });

  it('refuses a blank name', () => {
    expect(() => normalizePlanText({ name: '   ' })).toThrow(
      BadRequestException,
    );
  });

  it('only returns the fields that were sent (a PATCH keeps the rest)', () => {
    expect(normalizePlanText({ description: ' Lean ' })).toEqual({
      description: 'Lean',
    });
    expect(normalizePlanText({})).toEqual({});
  });
});
