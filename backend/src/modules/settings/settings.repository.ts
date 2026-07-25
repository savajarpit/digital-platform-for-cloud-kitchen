import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  BusinessProfile,
  OrderAcceptanceSettings,
} from '../../generated/prisma';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBusinessProfile(tenantId: string): Promise<BusinessProfile | null> {
    return this.prisma.businessProfile.findUnique({ where: { tenantId } });
  }

  findOrderAcceptanceSettings(
    tenantId: string,
  ): Promise<OrderAcceptanceSettings | null> {
    return this.prisma.orderAcceptanceSettings.findUnique({
      where: { tenantId },
    });
  }
}
