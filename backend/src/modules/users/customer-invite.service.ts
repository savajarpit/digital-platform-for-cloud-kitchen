import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { UsersRepository } from './users.repository';
import { RedisService } from '../../shared-modules/cache/redis.service';
import { CryptoUtil } from '../../common/utils/crypto.util';
import { withTimeout } from '../../common/utils/with-timeout.util';
import { buildStorefrontOrigin } from '../../common/utils/storefront-url.util';
import {
  ACCOUNT_INVITE_KEY_PREFIX,
  ACCOUNT_INVITE_TTL_SECONDS,
  ACCOUNT_INVITE_USER_KEY_PREFIX,
} from '../../common/constants/auth-token.constant';
import { AccountInviteEmailJob } from '../../shared-modules/queue/processors/mail.processor';
import { User } from '../../generated/prisma';

const QUEUE_ENQUEUE_TIMEOUT_MS = 3000;

/**
 * "Set your password" invite for a customer an admin created on their
 * behalf (Shopify's "Send account invite"). The token is single-use and
 * consumed by AuthService.resetPassword; issuing a new one revokes the
 * previous link so only the latest email ever works.
 */
@Injectable()
export class CustomerInviteService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  async sendInvite(user: User): Promise<void> {
    await this.revokePending(user.id);

    const token = CryptoUtil.generateToken(32);
    await Promise.all([
      this.redis.set(
        `${ACCOUNT_INVITE_KEY_PREFIX}${token}`,
        { userId: user.id },
        ACCOUNT_INVITE_TTL_SECONDS,
      ),
      this.redis.set(
        `${ACCOUNT_INVITE_USER_KEY_PREFIX}${user.id}`,
        token,
        ACCOUNT_INVITE_TTL_SECONDS,
      ),
    ]);

    const job: AccountInviteEmailJob = {
      email: user.email,
      tenantId: user.tenantId,
      firstName: user.firstName,
      inviteUrl: `${await this.storefrontOrigin(user.tenantId)}/reset-password?token=${token}&invite=1`,
    };
    await withTimeout(
      this.mailQueue.add('send-account-invite', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `send-account-invite:${user.id}:${token}`,
      }),
      QUEUE_ENQUEUE_TIMEOUT_MS,
    );
  }

  isPending(userId: string): Promise<boolean> {
    return this.redis.exists(`${ACCOUNT_INVITE_USER_KEY_PREFIX}${userId}`);
  }

  private async revokePending(userId: string): Promise<void> {
    const userKey = `${ACCOUNT_INVITE_USER_KEY_PREFIX}${userId}`;
    const previous = await this.redis.get<string>(userKey);
    if (!previous) return;
    await Promise.all([
      this.redis.del(`${ACCOUNT_INVITE_KEY_PREFIX}${previous}`),
      this.redis.del(userKey),
    ]);
  }

  private async storefrontOrigin(tenantId: string): Promise<string> {
    const tenant = await this.usersRepo.findTenantDomain(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return buildStorefrontOrigin(tenant, {
      platformRootDomain: this.config.get<string>('app.platformRootDomain'),
      frontendUrl: this.config.get<string>('app.frontendUrl')!,
    });
  }
}
