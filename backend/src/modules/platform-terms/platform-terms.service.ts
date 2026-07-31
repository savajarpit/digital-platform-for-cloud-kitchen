import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlatformTermsRepository } from './platform-terms.repository';
import { CreatePlatformTermsDto } from './dto/create-platform-terms.dto';
import { PlatformTerms } from '../../generated/prisma';

export interface MyPlatformTermsStatus {
  hasTerms: boolean;
  latestVersion: number | null;
  content: string | null;
  accepted: boolean;
}

@Injectable()
export class PlatformTermsService {
  constructor(private readonly platformTermsRepo: PlatformTermsRepository) {}

  getLatest(): Promise<PlatformTerms | null> {
    return this.platformTermsRepo.findLatest();
  }

  listAll(): Promise<PlatformTerms[]> {
    return this.platformTermsRepo.findAll();
  }

  async publish(dto: CreatePlatformTermsDto): Promise<PlatformTerms> {
    const latest = await this.platformTermsRepo.findLatest();
    return this.platformTermsRepo.create(
      (latest?.version ?? 0) + 1,
      dto.content,
    );
  }

  async getMyStatus(
    tenantId: string,
    userId: string,
  ): Promise<MyPlatformTermsStatus> {
    const latest = await this.platformTermsRepo.findLatest();
    if (!latest) {
      return {
        hasTerms: false,
        latestVersion: null,
        content: null,
        accepted: true,
      };
    }

    const acceptance = await this.platformTermsRepo.findAcceptance(
      tenantId,
      userId,
      latest.version,
    );
    return {
      hasTerms: true,
      latestVersion: latest.version,
      content: latest.content,
      accepted: Boolean(acceptance),
    };
  }

  /** Used by PlatformTermsGuard — cheap enough to call per-request (single indexed lookup, tiny table). */
  async isCompliant(tenantId: string, userId: string): Promise<boolean> {
    const latest = await this.platformTermsRepo.findLatest();
    if (!latest) return true; // nothing published yet — nothing to accept

    const acceptance = await this.platformTermsRepo.findAcceptance(
      tenantId,
      userId,
      latest.version,
    );
    return Boolean(acceptance);
  }

  async accept(
    tenantId: string,
    userId: string,
    ipAddress: string | null,
  ): Promise<void> {
    const latest = await this.platformTermsRepo.findLatest();
    if (!latest) {
      throw new NotFoundException('No platform terms have been published yet');
    }

    const existing = await this.platformTermsRepo.findAcceptance(
      tenantId,
      userId,
      latest.version,
    );
    if (existing) {
      throw new ConflictException('Already accepted the current terms');
    }

    await this.platformTermsRepo.createAcceptance(
      tenantId,
      userId,
      latest.version,
      ipAddress,
    );
  }
}
