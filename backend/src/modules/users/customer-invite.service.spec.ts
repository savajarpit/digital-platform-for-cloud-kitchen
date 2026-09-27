import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bull';
import { CustomerInviteService } from './customer-invite.service';
import { UsersRepository } from './users.repository';
import { RedisService } from '../../shared-modules/cache/redis.service';
import { User } from '../../generated/prisma';

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
const mockQueue = { add: jest.fn().mockResolvedValue({}) };
const mockUsersRepo = { findTenantDomain: jest.fn() };
const config: Record<string, string | undefined> = {
  'app.frontendUrl': 'http://localhost:3001',
  'app.platformRootDomain': 'okaysync.com',
};

function build(): CustomerInviteService {
  return new CustomerInviteService(
    mockUsersRepo as unknown as UsersRepository,
    mockRedis as unknown as RedisService,
    { get: (k: string) => config[k] } as unknown as ConfigService,
    mockQueue as unknown as Queue,
  );
}

const user = {
  id: 'u1',
  tenantId: 't1',
  email: 'priya@example.com',
  firstName: 'Priya',
} as User;

const inviteTokens = () =>
  [...store.keys()].filter((k) => k.startsWith('account-invite:'));

describe('CustomerInviteService', () => {
  let service: CustomerInviteService;

  beforeEach(() => {
    store.clear();
    service = build();
    mockUsersRepo.findTenantDomain.mockResolvedValue({
      slug: 'johns',
      customDomain: null,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("emails a link on the tenant's own storefront", async () => {
    await service.sendInvite(user);

    const [name, job] = mockQueue.add.mock.calls[0] as [
      string,
      { inviteUrl: string },
    ];
    expect(name).toBe('send-account-invite');
    expect(job).toMatchObject({ email: user.email, firstName: 'Priya' });
    expect(job.inviteUrl).toMatch(
      /^https:\/\/johns\.okaysync\.com\/reset-password\?token=\w+&invite=1$/,
    );
    await expect(service.isPending('u1')).resolves.toBe(true);
  });

  it('revokes the previous link when the invite is resent', async () => {
    await service.sendInvite(user);
    const [first] = inviteTokens();

    await service.sendInvite(user);

    const tokens = inviteTokens();
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).not.toBe(first);
    expect(store.get('account-invite-user:u1')).toBe(
      tokens[0].slice('account-invite:'.length),
    );
  });

  it('is not pending when no invite was ever sent', async () => {
    await expect(service.isPending('u1')).resolves.toBe(false);
  });
});
