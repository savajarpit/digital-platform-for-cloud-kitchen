import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddonGroupsService } from './addon-groups.service';
import { CreateAddonGroupDto } from './dto/create-addon-group.dto';
import { CreateAddonItemDto } from './dto/create-addon-item.dto';

async function errorsFor(
  cls: new () => object,
  body: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('AddonGroupsService.createGroup', () => {
  const repo = { createGroup: jest.fn().mockResolvedValue({ id: 'g1' }) };
  const service = new AddonGroupsService(repo as never);

  it('checks a lone minimum against the default maximum of 1', () => {
    expect(() =>
      service.createGroup('t1', { name: 'Spice', minSelections: 5 }),
    ).toThrow(BadRequestException);
    expect(repo.createGroup).not.toHaveBeenCalled();
  });

  it('accepts sensible bounds, including the defaults', async () => {
    await service.createGroup('t1', { name: 'Extras' });
    await service.createGroup('t1', {
      name: 'Pick 2',
      minSelections: 2,
      maxSelections: 3,
    });
    expect(repo.createGroup).toHaveBeenCalledTimes(2);
  });
});

describe('add-on DTOs', () => {
  it('refuse blank names and trim real ones', async () => {
    expect(await errorsFor(CreateAddonGroupDto, { name: '  ' })).toContain(
      'Give the add-on group a name.',
    );
    expect(
      plainToInstance(CreateAddonGroupDto, { name: ' Extras ' }).name,
    ).toBe('Extras');
    expect(
      await errorsFor(CreateAddonItemDto, {
        addonGroupId: '7f1c2a0e-6b1f-4c1e-9a3e-1c2b3d4e5f60',
        name: '   ',
        priceInPaise: 1000,
      }),
    ).toContain('Give the add-on a name.');
  });

  it('cap the add-on price', async () => {
    expect(
      await errorsFor(CreateAddonItemDto, {
        addonGroupId: '7f1c2a0e-6b1f-4c1e-9a3e-1c2b3d4e5f60',
        name: 'Roti',
        priceInPaise: 9_999_999_999,
      }),
    ).toContain('Price can be at most ₹1,00,000.');
  });
});
