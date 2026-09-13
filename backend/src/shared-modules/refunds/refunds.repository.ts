import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Refund, RefundMethod } from '../../generated/prisma';

export interface CreateRefundInput {
  tenantId: string;
  orderId?: string;
  subscriptionId?: string;
  method: RefundMethod;
  amountInPaise: number;
  convenienceFeeInPaise: number;
  netRefundInPaise: number;
  razorpayRefundId?: string;
  recordedByUserId: string;
  notes?: string;
}

/**
 * Shared by the `orders` and `subscriptions` modules — one Refund table
 * covers both (see the Refund model comment in schema.prisma), so this
 * lives in shared-modules rather than under either feature module.
 */
@Injectable()
export class RefundsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRefundInput): Promise<Refund> {
    return this.prisma.refund.create({ data: input });
  }

  findForOrder(tenantId: string, orderId: string): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { tenantId, orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findForSubscription(
    tenantId: string,
    subscriptionId: string,
  ): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { tenantId, subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
