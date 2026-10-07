import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMealDto, MAX_MEAL_PRICE_IN_PAISE } from './create-meal.dto';
import { CreateCategoryDto } from './create-category.dto';

async function errorsFor(
  cls: new () => object,
  body: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(cls, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const messages = (e: (typeof errors)[number]): string[] => [
    ...Object.values(e.constraints ?? {}),
    ...(e.children ?? []).flatMap(messages),
  ];
  return errors.flatMap(messages);
}

const meal = { name: 'Paneer Bowl', priceInPaise: 24900 };

describe('CreateMealDto', () => {
  it('accepts a normal meal and trims the name', async () => {
    expect(
      await errorsFor(CreateMealDto, { ...meal, name: '  Bowl  ' }),
    ).toEqual([]);
    expect(
      plainToInstance(CreateMealDto, { ...meal, name: '  Bowl  ' }).name,
    ).toBe('Bowl');
  });

  it('refuses a blank name', async () => {
    expect(await errorsFor(CreateMealDto, { ...meal, name: '   ' })).toContain(
      'Give the meal a name.',
    );
  });

  it('caps the price so it never overflows the database', async () => {
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        priceInPaise: MAX_MEAL_PRICE_IN_PAISE,
      }),
    ).toEqual([]);
    expect(
      await errorsFor(CreateMealDto, { ...meal, priceInPaise: 9_999_999_999 }),
    ).toContain('Price can be at most ₹1,00,000.');
  });

  it('only takes http(s) image links, and treats "" as removing the image', async () => {
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        imageUrl: 'javascript:alert(1)',
      }),
    ).toContain('Image must be an http(s) link.');
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        imageUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/a.png',
        imageUrls: ['http://localhost:3000/uploads/b.png'],
      }),
    ).toEqual([]);
    expect(
      plainToInstance(CreateMealDto, { ...meal, imageUrl: '' }).imageUrl,
    ).toBeNull();
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        imageUrls: ['data:text/html,x'],
      }),
    ).toContain('Each gallery image must be an http(s) link.');
  });

  it('keeps nutrition to the four values the form edits', async () => {
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        nutrition: { calories: 420, protein: '18g', carbs: '45g', fat: '16g' },
      }),
    ).toEqual([]);
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        nutrition: { junk: 'x'.repeat(5000) },
      }),
    ).toEqual(['property junk should not exist']);
    expect(
      (
        await errorsFor(CreateMealDto, {
          ...meal,
          nutrition: { protein: 'x'.repeat(21) },
        })
      ).length,
    ).toBe(1);
  });

  it('caps weight', async () => {
    expect(
      await errorsFor(CreateMealDto, {
        ...meal,
        weightValue: 1e12,
        weightUnit: 'G',
      }),
    ).toContain('Weight can be at most 100000.');
  });
});

describe('CreateCategoryDto', () => {
  it('refuses a blank name and trims a real one', async () => {
    expect(
      await errorsFor(CreateCategoryDto, { name: '  ', slug: 'x' }),
    ).toContain('Give the category a name.');
    expect(
      plainToInstance(CreateCategoryDto, { name: ' Salads ', slug: 'salads' })
        .name,
    ).toBe('Salads');
  });
});
