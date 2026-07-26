import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { NotificationAttempt } from './notifications.service';

@Injectable()
export class NotificationLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(
    tenantId: string,
    orderId: string,
    attempts: NotificationAttempt[],
  ): Promise<unknown> {
    if (attempts.length === 0) return Promise.resolve();
    return this.prisma.notificationLog.createMany({
      data: attempts.map((attempt) => ({
        tenantId,
        orderId,
        channel: attempt.channel,
        recipientType: attempt.recipientType,
        recipient: attempt.recipient,
        status: attempt.status,
        providerMessageId: attempt.providerMessageId,
        errorMessage: attempt.errorMessage,
      })),
    });
  }
}
