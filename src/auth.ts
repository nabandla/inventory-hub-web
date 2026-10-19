import { InteractionRequiredAuthError, type Configuration, type IPublicClientApplication } from "@azure/msal-browser";
import { ApiError } from "./api";
import type { AppConfig } from "./config";

export function buildMsalConfig(config: AppConfig): Configuration {
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      // Must exactly match a "Single-page application" redirect address in the Entra registration
      redirectUri: window.location.origin,
    },
    // sessionStorage: the sign-in ends when the tab closes (safer than keeping tokens in localStorage)
    cache: { cacheLocation: "sessionStorage" },
  };
}

/** A function that returns a valid access token for the API, renewing it silently when needed. */
export function createTokenGetter(instance: IPublicClientApplication, apiScope: string) {
  return async function getToken(): Promise<string> {
    const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0];
    if (!account) throw new ApiError(401, "Not signed in");
    try {
      const result = await instance.acquireTokenSilent({ scopes: [apiScope], account });
      return result.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Silent renewal is not possible (session expired, consent needed): go through sign-in again
        await instance.acquireTokenRedirect({ scopes: [apiScope], account });
        return new Promise<string>(() => {}); // the page navigates away; never resolves
      }
      throw error;
    }
  };
}
