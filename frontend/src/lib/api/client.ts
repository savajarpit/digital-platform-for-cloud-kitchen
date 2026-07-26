import type { ApiErrorResponse, ApiResponse, PaginationMeta } from "@/lib/api/response";

export class ApiError extends Error {
  status: number;
  code?: string;
  extra?: ApiErrorResponse;

  constructor(message: string, status: number, extra?: ApiErrorResponse) {
    super(message);
    this.status = status;
    this.code = extra?.code;
    this.extra = extra;
  }
}

export async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;
  if (!res.ok || !body.success) {
    const err = body as ApiErrorResponse;
    throw new ApiError(err.message, res.status, err);
  }
  return (body as ApiResponse<T>).data;
}

/**
 * The response envelope carries pagination `meta` as a sibling of `data`,
 * not nested inside it (see ResponseTransformInterceptor on the backend) —
 * `parseOrThrow` discards it. Use this for any paginated endpoint instead.
 */
export async function parseWithMeta<T>(
  res: Response,
): Promise<{ data: T; meta?: PaginationMeta }> {
  const body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;
  if (!res.ok || !body.success) {
    const err = body as ApiErrorResponse;
    throw new ApiError(err.message, res.status, err);
  }
  const ok = body as ApiResponse<T>;
  return { data: ok.data, meta: ok.meta };
}

/**
 * Authenticated fetch for Client Components — goes through /api/proxy so the
 * httpOnly access-token cookie can be attached server-side (see that route
 * for why). `path` is the backend path without the /api/v1 prefix, e.g.
 * "/addresses".
 */
export async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return parseOrThrow<T>(res);
}

/** Same as {@link proxyFetch}, but also returns the pagination `meta`. */
export async function proxyFetchPaginated<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: PaginationMeta }> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  return parseWithMeta<T>(res);
}
