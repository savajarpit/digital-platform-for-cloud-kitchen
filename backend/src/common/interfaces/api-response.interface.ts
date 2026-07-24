export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
  timestamp: string;
  path?: string;
}
