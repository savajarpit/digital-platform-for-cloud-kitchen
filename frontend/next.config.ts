import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Produces a minimal `.next/standalone` server bundle (only the node_modules
  // actually needed at runtime) — required for the production Docker image.
  output: "standalone",
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
