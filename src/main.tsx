import { EventType, PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { buildMsalConfig } from "./auth";
import { readConfig } from "./config";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
const { config, missing } = readConfig(import.meta.env);

if (!config) {
  root.render(
    <main>
      <h1>Inventory Hub</h1>
      <p role="alert" className="banner banner-error">
        This site is not configured. Missing settings: {missing.join(", ")}. Copy .env.example to .env and fill them in.
      </p>
    </main>,
  );
} else {
  const msal = new PublicClientApplication(buildMsalConfig(config));
  void msal.initialize().then(() => {
    const first = msal.getAllAccounts()[0];
    if (first) msal.setActiveAccount(first);
    msal.addEventCallback((event) => {
      const account = (event.payload as { account?: Parameters<typeof msal.setActiveAccount>[0] } | null)?.account;
      if (event.eventType === EventType.LOGIN_SUCCESS && account) msal.setActiveAccount(account);
    });
    root.render(
      <StrictMode>
        <MsalProvider instance={msal}>
          <App config={config} />
        </MsalProvider>
      </StrictMode>,
    );
  });
}
