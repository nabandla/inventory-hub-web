import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "./api";
import { createTokenGetter } from "./auth";
import { ItemsPage } from "./components/ItemsPage";
import type { AppConfig } from "./config";
import { decodeRoles } from "./token";

export function App({ config }: { config: AppConfig }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [roles, setRoles] = useState<string[] | null>(null);

  const getToken = useMemo(() => createTokenGetter(instance, config.apiScope), [instance, config.apiScope]);
  const api = useMemo(
    () => createApiClient({ baseUrl: config.apiBaseUrl, getToken }),
    [config.apiBaseUrl, getToken],
  );

  const signIn = () => void instance.loginRedirect({ scopes: [config.apiScope] });
  const signOut = () => void instance.logoutRedirect();

  // Show which roles the signed-in user's token carries (display only; the API enforces them)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getToken()
      .then((token) => !cancelled && setRoles(decodeRoles(token)))
      .catch(() => !cancelled && setRoles([]));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, getToken]);

  return (
    <main>
      <header className="top">
        <h1>Inventory Hub</h1>
        {isAuthenticated ? (
          <div className="who">
            <span>{accounts[0]?.name ?? accounts[0]?.username}</span>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : null}
      </header>

      {!isAuthenticated ? (
        <section className="card">
          <p>Sign in with your Microsoft account to view and add inventory items.</p>
          <button type="button" onClick={signIn}>
            Sign in
          </button>
        </section>
      ) : (
        <>
          <p className="roles">
            Your roles: {roles === null ? "checking…" : roles.length ? roles.join(", ") : "none (you can sign in but not use the API)"}
          </p>
          <ItemsPage api={api} onSessionExpired={signIn} />
        </>
      )}
    </main>
  );
}
