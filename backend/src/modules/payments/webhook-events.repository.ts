import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RazorpayWebhookEvent } from '../../generated/prisma';

@Injectable()
export class WebhookEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEventId(eventId: string): Promise<RazorpayWebhookEvent | null> {
    return this.prisma.razorpayWebhookEvent.findUnique({ where: { eventId } });
  }

  create(eventId: string, eventType: string): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.create({
      data: { eventId, eventType, status: 'PENDING' },
    });
  }

  markProcessed(id: string): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  markFailed(id: string, errorMessage: string): Promise<RazorpayWebhookEvent> {
    return this.prisma.razorpayWebhookEvent.update({
      where: { id },
      data: { status: 'FAILED', errorMessage },
    });
  }
}
