/** Server-only base URL — used by Server Components and Route Handlers. */
export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";

/** Browser-safe base URL — used by Client Components. */
export const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
