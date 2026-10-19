/** Talks to the Inventory Hub API. The contract is contract/openapi.json in the API repository. */

export type Item = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type NewItem = {
  sku: string;
  name: string;
  quantity: number;
};

export type ApiClient = {
  listItems(): Promise<Item[]>;
  createItem(item: NewItem): Promise<Item>;
};

/** status 0 means the request never got an answer (network down, blocked by CORS, ...). */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type ClientOptions = {
  baseUrl: string;
  /** Returns a fresh access token (MSAL renews it silently when needed). */
  getToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
};

export function createApiClient({ baseUrl, getToken, fetchImpl }: ClientOptions): ApiClient {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    let response: Response;
    try {
      // Called through a wrapper so the real window.fetch keeps its required `this`
      response = await (fetchImpl ?? ((input, options) => fetch(input, options)))(`${root}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new ApiError(0, "Network error");
    }

    if (!response.ok) {
      let detail: unknown;
      try {
        detail = (await response.json()).detail;
      } catch {
        detail = undefined;
      }
      throw new ApiError(response.status, `API answered ${response.status}`, detail);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  return {
    listItems: () => request<Item[]>("/v1/items"),
    createItem: (item) => request<Item>("/v1/items", { method: "POST", body: JSON.stringify(item) }),
  };
}

/** FastAPI validation errors (422) arrive as a list of {loc, msg}. */
function describeValidation(detail: unknown): string {
  if (!Array.isArray(detail)) return "Some of the values were not accepted.";
  const parts = detail
    .map((d: { loc?: unknown[]; msg?: string }) => {
      const field = Array.isArray(d.loc) ? String(d.loc[d.loc.length - 1]) : "";
      return field && d.msg ? `${field}: ${d.msg}` : d.msg;
    })
    .filter(Boolean);
  return parts.length ? parts.join("; ") : "Some of the values were not accepted.";
}

/** What a person should read for each kind of failure. Never shows technical internals. */
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something unexpected went wrong.";
  switch (error.status) {
    case 0:
      return "Can't reach the service. Check your connection and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to do this.";
    case 409:
      return "An item with this SKU already exists.";
    case 422:
      return describeValidation(error.detail);
    case 503:
      return "The service or its database is starting up. This can take a minute, please try again shortly.";
    default:
      return `Something went wrong (code ${error.status}). Please try again.`;
  }
}
