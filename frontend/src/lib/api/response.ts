export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Mirrors the backend's ResponseTransformInterceptor envelope. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  data: null;
  timestamp: string;
  path?: string;
  /** Machine-readable extras some exceptions attach, e.g. `code: 'ACCOUNT_NOT_VERIFIED'`. */
  code?: string;
  [extra: string]: unknown;
}
