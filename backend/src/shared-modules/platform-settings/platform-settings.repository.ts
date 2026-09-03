import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformSettings } from '../../generated/prisma';

const SINGLETON_ID = 'global';

@Injectable()
export class PlatformSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lazily creates the singleton row (all defaults) on first read — so a
   * fresh DB never needs a manual seed step just for this to work. */
  async findOrCreate(): Promise<PlatformSettings> {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: SINGLETON_ID },
    });
    if (existing) return existing;
    return this.prisma.platformSettings.create({
      data: { id: SINGLETON_ID },
    });
  }

  update(data: {
    whatsappOtpEnabled?: boolean;
    updatedByUserId?: string;
  }): Promise<PlatformSettings> {
    return this.prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
  }
}
