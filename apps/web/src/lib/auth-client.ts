import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { getAppUrl } from "@/lib/app";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : getAppUrl(),
  plugins: [organizationClient()],
});
