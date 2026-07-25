/** Mirrors the backend's ResponseTransformInterceptor envelope. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  data: null;
  timestamp: string;
  path?: string;
}
