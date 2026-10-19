# Inventory Hub Web

Web frontend for the Inventory Hub API (a separate repository: `nabandla/inventory-hub`).
Sign in with Microsoft, list inventory items, add new ones.

This repository only knows the API through its published contract (`contract/openapi.json` in the
API repository) and a Microsoft Entra ID access token. It shares no code with the API.

## Run it locally

Needs Node 24 or newer.

```
npm install
cp .env.example .env     # then fill in the values (see below)
npm run dev              # http://localhost:5173
```

The address **must** be `http://localhost:5173`: that exact redirect address is registered in Entra ID
(Vite is set to fail rather than move to another port).

## Settings (`.env`)

| Variable | What |
|---|---|
| `VITE_API_BASE_URL` | The API address, for example the dev web app |
| `VITE_TENANT_ID` | The Microsoft Entra ID tenant |
| `VITE_CLIENT_ID` | The Application (client) ID of this website's app registration (`inventory-hub-web`) |
| `VITE_API_SCOPE` | `api://<API application id>/access_as_user` |

**None of these are secrets**, and none may ever be: everything with a `VITE_` prefix is copied into the
page that visitors download. A browser app cannot keep a secret.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit and component tests (no network, no Microsoft) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build into `dist/` |

## How it works

1. **Sign in** sends you to Microsoft (authorization code flow with PKCE, handled by MSAL).
2. MSAL keeps the tokens in `sessionStorage` (cleared when the tab closes) and renews them silently.
3. Every API call sends `Authorization: Bearer <token>`.
4. What you may do depends on your **roles** (`Items.Read`, `Items.Write`), assigned in Entra ID under
   Enterprise applications, then the API, then Users and groups. The page shows the roles from your
   token for information only; the API enforces them.

See `HANDOVER.md` for status, decisions and next steps.
