import { Injectable } from '@nestjs/common';
import { PaginationMeta } from '../interfaces/api-response.interface';

@Injectable()
export class PaginationService {
  getOffsetSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  buildOffsetMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  encodeCursor(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }

  buildCursorMeta<T extends { id: string }>(
    items: T[],
    limit: number,
  ): Pick<PaginationMeta, 'hasNext' | 'nextCursor' | 'hasPrev'> {
    const hasNext = items.length > limit;
    const slice = hasNext ? items.slice(0, limit) : items;
    return {
      hasNext,
      hasPrev: false,
      nextCursor: hasNext
        ? this.encodeCursor(slice[slice.length - 1].id)
        : undefined,
    };
  }
}
