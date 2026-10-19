import { describe, expect, it } from "vitest";
import { readConfig } from "./config";

const full = {
  VITE_API_BASE_URL: " https://api.example.com ",
  VITE_TENANT_ID: "tenant",
  VITE_CLIENT_ID: "client",
  VITE_API_SCOPE: "api://x/access_as_user",
};

describe("readConfig", () => {
  it("reads and trims the settings", () => {
    const { config, missing } = readConfig(full);

    expect(missing).toEqual([]);
    expect(config).toEqual({
      apiBaseUrl: "https://api.example.com",
      tenantId: "tenant",
      clientId: "client",
      apiScope: "api://x/access_as_user",
    });
  });

  it("names every missing or blank setting", () => {
    const { config, missing } = readConfig({ ...full, VITE_TENANT_ID: "", VITE_API_SCOPE: "   ", VITE_CLIENT_ID: undefined });

    expect(config).toBeUndefined();
    expect(missing.sort()).toEqual(["VITE_API_SCOPE", "VITE_CLIENT_ID", "VITE_TENANT_ID"]);
  });
});
