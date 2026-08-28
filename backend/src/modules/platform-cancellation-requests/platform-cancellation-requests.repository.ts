import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PlatformCancellationRequest,
  PlatformCancellationRequestStatus,
  Prisma,
} from '../../generated/prisma';

const REQUEST_INCLUDE = {
  tenant: { select: { name: true } },
} satisfies Prisma.PlatformCancellationRequestInclude;

export type PlatformCancellationRequestWithTenant =
  Prisma.PlatformCancellationRequestGetPayload<{
    include: typeof REQUEST_INCLUDE;
  }>;

@Injectable()
export class PlatformCancellationRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.PlatformCancellationRequestUncheckedCreateInput,
  ): Promise<PlatformCancellationRequestWithTenant> {
    return this.prisma.platformCancellationRequest.create({
      data,
      include: REQUEST_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.platformCancellationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: REQUEST_INCLUDE,
    });
  }

  findById(id: string): Promise<PlatformCancellationRequest | null> {
    return this.prisma.platformCancellationRequest.findUnique({
      where: { id },
    });
  }

  updateStatus(
    id: string,
    status: PlatformCancellationRequestStatus,
  ): Promise<PlatformCancellationRequest> {
    return this.prisma.platformCancellationRequest.update({
      where: { id },
      data: { status },
    });
  }
}
