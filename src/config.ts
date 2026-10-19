export type AppConfig = {
  apiBaseUrl: string;
  tenantId: string;
  clientId: string;
  apiScope: string;
};

const NAMES = ["VITE_API_BASE_URL", "VITE_TENANT_ID", "VITE_CLIENT_ID", "VITE_API_SCOPE"] as const;

/** Returns the settings, or the names of the ones that are missing (so the page can say so). */
export function readConfig(env: Record<string, string | undefined>): { config?: AppConfig; missing: string[] } {
  const missing = NAMES.filter((name) => !env[name]?.trim());
  if (missing.length > 0) return { missing: [...missing] };
  return {
    missing: [],
    config: {
      apiBaseUrl: env.VITE_API_BASE_URL!.trim(),
      tenantId: env.VITE_TENANT_ID!.trim(),
      clientId: env.VITE_CLIENT_ID!.trim(),
      apiScope: env.VITE_API_SCOPE!.trim(),
    },
  };
}
