import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

const MINUTE = 60_000;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data younger than this is served from cache with no request at all;
        // older data is still shown instantly and refreshed quietly behind it.
        staleTime: MINUTE,
        gcTime: 10 * MINUTE,
        refetchOnWindowFocus: false,
        // A 4xx (not found, forbidden, validation) won't change on retry.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

/** One shared client in the browser so the cache survives page navigations;
 * a fresh one per server render so requests never share data. */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}

/** Drop every cached response — called on login/logout so one account's data
 * can never be shown to the next. */
export function clearQueryCache(): void {
  browserClient?.clear();
}
