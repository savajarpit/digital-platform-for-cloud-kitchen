import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PlatformCancellationRequestsRepository } from './platform-cancellation-requests.repository';
import { CreateCancellationRequestDto } from './dto/create-cancellation-request.dto';
import { UpdateCancellationRequestStatusDto } from './dto/update-cancellation-request-status.dto';
import { PlatformCancellationRequestEmailJob } from '../../shared-modules/queue/processors/mail.processor';

@Injectable()
export class PlatformCancellationRequestsService {
  private readonly logger = new Logger(
    PlatformCancellationRequestsService.name,
  );

  constructor(
    private readonly requestsRepo: PlatformCancellationRequestsRepository,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  /** Tenant-authenticated — deliberately never touches PlatformSubscription
   * or Tenant.status itself. This is a "please contact me" ask, not a real
   * cancellation; only Arpit's own existing scheduleCancellation() flow
   * (SUPER_ADMIN, on the tenant detail page) actually cancels anything. */
  async create(tenantId: string, dto: CreateCancellationRequestDto) {
    const request = await this.requestsRepo.create({
      tenantId,
      reason: dto.reason,
    });

    await this.notify({
      tenantName: request.tenant.name,
      reason: request.reason,
    });

    return { received: true };
  }

  listRequests() {
    return this.requestsRepo.findAll();
  }

  async updateStatus(id: string, dto: UpdateCancellationRequestStatusDto) {
    const request = await this.requestsRepo.findById(id);
    if (!request) throw new NotFoundException('Cancellation request not found');
    return this.requestsRepo.updateStatus(id, dto.status);
  }

  private async notify(
    job: Omit<PlatformCancellationRequestEmailJob, 'email'>,
  ): Promise<void> {
    const alertEmail = this.config.get<string>('platformBilling.alertEmail');
    if (!alertEmail) return;
    try {
      await this.mailQueue.add(
        'send-platform-cancellation-request',
        { ...job, email: alertEmail },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.warn(
        'Could not enqueue cancellation-request notification email',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
