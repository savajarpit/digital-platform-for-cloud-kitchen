import { PaginationMeta } from './api-response.interface';

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
