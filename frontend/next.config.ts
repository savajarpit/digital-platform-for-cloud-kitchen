import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Produces a minimal `.next/standalone` server bundle (only the node_modules
  // actually needed at runtime) — required for the production Docker image.
  output: "standalone",
  experimental: {
    // Every route here is dynamic (cookies()/headers() for tenant + session),
    // and Next's default for dynamic pages is 0s — so returning to a page you
    // just left re-ran the server render and re-showed loading.tsx. 30s
    // reuses the already-rendered page on repeat navigation; router.refresh()
    // (called on login/logout) still invalidates it immediately.
    staleTimes: { dynamic: 30 },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
