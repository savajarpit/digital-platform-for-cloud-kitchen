import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PlatformTerms, PlatformTermsAcceptance } from '../../generated/prisma';

@Injectable()
export class PlatformTermsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLatest(): Promise<PlatformTerms | null> {
    return this.prisma.platformTerms.findFirst({
      orderBy: { version: 'desc' },
    });
  }

  findAll(): Promise<PlatformTerms[]> {
    return this.prisma.platformTerms.findMany({ orderBy: { version: 'desc' } });
  }

  create(version: number, content: string): Promise<PlatformTerms> {
    return this.prisma.platformTerms.create({ data: { version, content } });
  }

  findAcceptance(
    tenantId: string,
    userId: string,
    version: number,
  ): Promise<PlatformTermsAcceptance | null> {
    return this.prisma.platformTermsAcceptance.findUnique({
      where: {
        tenantId_userId_version: { tenantId, userId, version },
      },
    });
  }

  createAcceptance(
    tenantId: string,
    userId: string,
    version: number,
    ipAddress: string | null,
  ): Promise<PlatformTermsAcceptance> {
    return this.prisma.platformTermsAcceptance.create({
      data: { tenantId, userId, version, ipAddress },
    });
  }
}
