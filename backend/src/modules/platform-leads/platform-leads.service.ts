import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PlatformLeadsRepository } from './platform-leads.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { PlatformLeadNotificationEmailJob } from '../../shared-modules/queue/processors/mail.processor';

@Injectable()
export class PlatformLeadsService {
  private readonly logger = new Logger(PlatformLeadsService.name);

  constructor(
    private readonly leadsRepo: PlatformLeadsRepository,
    private readonly config: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  /** Public — a cold "contact us" submission from the (separate,
   * not-yet-built) marketing site. Deliberately never creates a Tenant or
   * triggers any payment flow — confirmed 2026-08-02, every platform-plan
   * sale goes through manual review first. */
  async createLead(dto: CreateLeadDto) {
    const lead = await this.leadsRepo.create({
      businessName: dto.businessName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      planId: dto.planId,
      message: dto.message,
    });

    await this.notify({
      businessName: lead.businessName,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone,
      planName: lead.plan?.name ?? null,
      message: lead.message,
      isUpgradeRequest: false,
    });

    return { received: true };
  }

  listLeads() {
    return this.leadsRepo.findAll();
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto) {
    const lead = await this.leadsRepo.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');
    return this.leadsRepo.updateStatus(id, dto.status);
  }

  private async notify(
    job: Omit<PlatformLeadNotificationEmailJob, 'email'>,
  ): Promise<void> {
    const alertEmail = this.config.get<string>('platformBilling.alertEmail');
    if (!alertEmail) return;
    try {
      await this.mailQueue.add(
        'send-platform-lead-notification',
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
        'Could not enqueue lead-notification email',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
