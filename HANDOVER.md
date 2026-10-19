# Inventory Hub Web - Handover (read this first in a new chat)

Last updated: 2026-10-19. No secrets in this file.
The API repository (`nabandla/inventory-hub`, folder `inventory-hub` next to this one) has its own
`HANDOVER.md` with the teaching rules, the Azure setup, and the full history. Read that too.

## Who / how to teach
Same rules as the API repo: the learner is a data engineer learning software engineering. Don't write or
edit code unless they say "write it". Explain in plain language, give hints, ask them to predict.

## What this is
A separate-repo React frontend for the Inventory Hub API, playing the part of "a different team's
website" that consumes the API through its contract and a Microsoft Entra ID token only.

## Stack and layout
React 19 + TypeScript + Vite, `@azure/msal-browser` / `@azure/msal-react`, Vitest + Testing Library.
- `src/api.ts` API client (`/v1/items` list + create), `ApiError`, `describeError` (plain-language messages per status)
- `src/validation.ts` form rules mirroring the API (SKU 1-50, name 1-200, whole quantity 0..2147483647)
- `src/auth.ts` MSAL config (sessionStorage) and the token getter (silent renew, redirect when interaction is needed)
- `src/token.ts` decodes roles from the token FOR DISPLAY ONLY (never trusted)
- `src/config.ts` reads `VITE_*` settings and names any missing ones
- `src/components/ItemForm.tsx`, `ItemsPage.tsx` (loading/saving/error states, 401 -> sign in again, double-submit guard)
- `src/App.tsx`, `src/main.tsx` shell and MSAL wiring
- Tests next to the code (`*.test.ts(x)`): 51 tests, no network. Mutation-checked: removing the 401 handling,
  clearing the form after a failed save, and dropping the Authorization header each make tests fail.
- `.github/workflows/ci.yml`: `npm ci`, typecheck, test, build (placeholder public settings). Docs-only pushes skipped.

## Entra ID registrations (IDs are not secrets)
- Tenant `694f30ad-5203-45f4-ba31-1426ed35695c`
- This website: `inventory-hub-web`, client ID `6492300b-ac31-42af-911a-41909a33f45e`, platform
  Single-page application, redirect `http://localhost:5173`, delegated permission `access_as_user` on the DEV API
  (admin consented). No client secret exists or should exist.
- Dev API: `inventory-hub-api` `4e7f5012-a1c2-464f-90b6-42e346e8deae`, scope `access_as_user` (admins and users),
  app roles `Items.Read` / `Items.Write`. The user was assigned both roles under Enterprise applications.
- Prod API `inventory-hub-api-prod` `5b4c6e3d-f6bf-4a0f-8110-fea4962f306c` has NO `access_as_user` scope yet and
  this website has no prod registration yet.

## Verified
- Typecheck clean, 51 tests pass, production build works, dev server serves the page with the settings.
- The DEV API's CORS (setting `CORS_ORIGINS=http://localhost:5173`) answers the browser preflight for
  `Authorization` + `Content-Type` and refuses other origins.
- VERIFIED by the user (2026-10-19): real interactive Microsoft sign-in in a browser at http://localhost:5173, the page listed an item created earlier from Postman (`TEST-0001`, id 44 on dev), and an item added through the form was saved. Still worth confirming independently with `GET /v1/items` (the database, not the screen).
- Dev data note: test items (`TEST-0001` and the one added through the form) are in the DEV database.

## Decisions
- Separate repo (different team model); no shared code; contract = API repo `contract/openapi.json`.
- Tokens in `sessionStorage`; no secrets anywhere; `VITE_*` values are public by design.
- The page never shows technical error text; each status maps to a plain message.

## Known gaps / ideas for the API (found while writing the client)
- Quantity above 2147483647: the API has no upper limit in its schema; the database column is INT, so such a
  value reaches the database and would come back as a misleading 503 "Database unavailable" (pyodbc error).
  Verify, then add `le=2147483647` to the API's `ItemCreate`/`ItemUpdate` and regenerate the contract.
- The list endpoint has no total count, so the UI cannot show pages yet.

## Next
1. (done, see Verified) Run, sign in, create an item.
2. Edit and delete (needs `PUT`/`DELETE`, role Items.Write).
3. Deploy to Azure Static Web Apps (dev): add its address to the DEV API's `CORS_ORIGINS` and to this app's
   SPA redirect URIs in Entra; the key-in-browser problem does not exist any more (tokens, not keys).
4. Prod: an `access_as_user` scope on the prod API, a prod SPA registration (or the same with prod redirect),
   prod settings; a read-only user to see a real 403 in the UI.
