import type { NextConfig } from "next";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

// Load monorepo root .env.local so secrets live in one place
loadDotenv({ path: resolve(__dirname, "../../.env.local") });
loadDotenv({ path: resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: [
    "@securitydesk/config",
    "@securitydesk/shared",
    "@securitydesk/database",
    "@securitydesk/ui",
    "@securitydesk/ai",
    "@securitydesk/integrations",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
