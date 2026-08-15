import type { NextConfig } from "next"

import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  transpilePackages: ["@blak/ui"],
  images: {
    remotePatterns: [{ hostname: "images.unsplash.com" }],
  },
}
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
