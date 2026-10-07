import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function setup(target: { id: string; role: string } | null) {
  const repo = {
    findById: jest.fn().mockResolvedValue(target),
    softDelete: jest.fn().mockResolvedValue(undefined),
    findByEmailIncludingRemoved: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: unknown) => data),
    update: jest.fn().mockImplementation((_id: string, data: unknown) => data),
  };
  const service = new UsersService(repo as never, {} as never, {} as never);
  return { service, repo };
}

const owner = { userId: 'owner-1', role: 'OWNER' };
const superAdmin = { userId: 'sa-1', role: 'SUPER_ADMIN' };

describe('UsersService.remove', () => {
  it('removes a staff member or customer for the owner', async () => {
    const { service, repo } = setup({ id: 'staff-1', role: 'STAFF' });
    await service.remove('staff-1', 't1', owner);
    expect(repo.softDelete).toHaveBeenCalledWith('staff-1');
  });

  it('refuses removing your own account (it would lock you out)', async () => {
    const { service, repo } = setup({ id: 'owner-1', role: 'OWNER' });
    await expect(service.remove('owner-1', 't1', owner)).rejects.toThrow(
      "You can't remove your own account.",
    );
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('lets only the platform admin remove an owner', async () => {
    const other = { id: 'owner-2', role: 'OWNER' };
    const asOwner = setup(other);
    await expect(
      asOwner.service.remove('owner-2', 't1', owner),
    ).rejects.toThrow(ForbiddenException);
    const asPlatform = setup(other);
    await asPlatform.service.remove('owner-2', 't1', superAdmin);
    expect(asPlatform.repo.softDelete).toHaveBeenCalledWith('owner-2');
  });

  it('404s for a user outside this business', async () => {
    const { service } = setup(null);
    await expect(service.remove('x', 't1', owner)).rejects.toThrow(
      NotFoundException,
    );
  });
});

const newUser = {
  email: 'a@b.c',
  password: 'P@ssw0rd!',
  firstName: 'Al',
};

describe('UsersService.create', () => {
  it('refuses an owner creating a platform admin', async () => {
    const { service, repo } = setup(null);
    await expect(
      service.create({ ...newUser, role: 'SUPER_ADMIN' as never }, 't1', owner),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('lets an owner create staff', async () => {
    const { service, repo } = setup(null);
    await service.create({ ...newUser, role: 'STAFF' as never }, 't1', owner);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'STAFF' }),
    );
  });
});

describe('UsersService.update', () => {
  it('refuses an owner promoting themselves to platform admin', async () => {
    const { service, repo } = setup({ id: 'owner-1', role: 'OWNER' });
    await expect(
      service.update('owner-1', 't1', { role: 'SUPER_ADMIN' as never }, owner),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('leaves the role untouched when none is sent (no silent demotion)', async () => {
    const { service, repo } = setup({ id: 'staff-1', role: 'STAFF' });
    await service.update('staff-1', 't1', { firstName: 'New' }, owner);
    expect(repo.update).toHaveBeenCalledWith('staff-1', { firstName: 'New' });
  });

  it('stores a reset password as passwordHash, never the plain text', async () => {
    const { service, repo } = setup({ id: 'staff-1', role: 'STAFF' });
    await service.update('staff-1', 't1', { password: 'N3w@pass!' }, owner);
    const data = repo.update.mock.calls[0][1] as Record<string, unknown>;
    expect(data.password).toBeUndefined();
    expect(typeof data.passwordHash).toBe('string');
    expect(data.passwordHash).not.toBe('N3w@pass!');
  });

  it('refuses resetting your own password here (skips the current-password check)', async () => {
    const { service } = setup({ id: 'owner-1', role: 'OWNER' });
    await expect(
      service.update('owner-1', 't1', { password: 'N3w@pass!' }, owner),
    ).rejects.toThrow(ForbiddenException);
  });
});
