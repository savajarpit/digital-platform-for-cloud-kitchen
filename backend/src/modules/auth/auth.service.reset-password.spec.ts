import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Queue } from 'bull';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { SettingsRepository } from '../settings/settings.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { ContentService } from '../content/content.service';
import { RedisService } from '../../shared-modules/cache/redis.service';
import { TenantLimitsService } from '../tenant-limits/tenant-limits.service';
import { HashUtil } from '../../common/utils/hash.util';

const store = new Map<string, unknown>();
const mockRedis = {
  get: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
  set: jest.fn((k: string, v: unknown) => {
    store.set(k, v);
    return Promise.resolve();
  }),
  del: jest.fn((k: string) => {
    store.delete(k);
    return Promise.resolve();
  }),
  exists: jest.fn((k: string) => Promise.resolve(store.has(k))),
};
const mockUsersRepo = {
  update: jest.fn(),
  findByEmail: jest.fn(),
  findTenantDomain: jest.fn(),
};
const mockQueue = { add: jest.fn().mockResolvedValue({}) };
const config: Record<string, string> = {
  'app.frontendUrl': 'https://app.okaysync.com',
  'app.platformRootDomain': 'okaysync.com',
};

function build(): AuthService {
  return new AuthService(
    mockUsersRepo as unknown as UsersRepository,
    {} as SettingsRepository,
    {} as NotificationsService,
    {} as ContentService,
    mockRedis as unknown as RedisService,
    {} as JwtService,
    { get: (k: string) => config[k] } as unknown as ConfigService,
    mockQueue as unknown as Queue,
    {} as TenantLimitsService,
  );
}

describe('AuthService — reset password & invites', () => {
  let service: AuthService;

  beforeEach(() => {
    store.clear();
    service = build();
    jest.spyOn(HashUtil, 'hash').mockResolvedValue('new-hash');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('accepts an account-invite token once, then clears the pending marker', async () => {
    store.set('account-invite:tok', { userId: 'u1' });
    store.set('account-invite-user:u1', 'tok');

    await service.resetPassword({ token: 'tok', newPassword: 'N3w!pass' });

    expect(mockUsersRepo.update).toHaveBeenCalledWith('u1', {
      passwordHash: 'new-hash',
    });
    expect(store.has('account-invite:tok')).toBe(false);
    expect(store.has('account-invite-user:u1')).toBe(false);
    await expect(
      service.resetPassword({ token: 'tok', newPassword: 'N3w!pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('still accepts a normal forgot-password token', async () => {
    store.set('password-reset:abc', { userId: 'u2' });
    await service.resetPassword({ token: 'abc', newPassword: 'N3w!pass' });
    expect(mockUsersRepo.update).toHaveBeenCalledWith('u2', {
      passwordHash: 'new-hash',
    });
    expect(store.has('password-reset:abc')).toBe(false);
  });

  it('rejects an unknown token', async () => {
    await expect(
      service.resetPassword({ token: 'nope', newPassword: 'N3w!pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockUsersRepo.update).not.toHaveBeenCalled();
  });

  it("links a customer's reset email to their kitchen's storefront, not the platform console", async () => {
    mockUsersRepo.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'p@example.com',
      role: 'CUSTOMER',
      tenantId: 't1',
    });
    mockUsersRepo.findTenantDomain.mockResolvedValue({
      slug: 'demo',
      customDomain: null,
    });

    await service.forgotPassword({ email: 'p@example.com' }, 't1');

    const [, job] = mockQueue.add.mock.calls[0] as [
      string,
      { resetUrl: string },
    ];
    expect(job.resetUrl).toMatch(
      /^https:\/\/demo\.okaysync\.com\/reset-password\?token=\w+$/,
    );
  });
});
