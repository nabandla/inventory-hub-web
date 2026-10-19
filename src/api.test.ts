import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, describeError } from "./api";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(fetchImpl: typeof fetch, token = "tok-123") {
  return createApiClient({
    baseUrl: "https://api.example.com/",
    getToken: async () => token,
    fetchImpl,
  });
}

describe("createApiClient", () => {
  it("lists items from /v1/items with the bearer token", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, [{ id: 1 }]));

    const items = await clientWith(fetchMock as unknown as typeof fetch).listItems();

    expect(items).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/items"); // no double slash from the trailing /
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
    expect(init.method).toBeUndefined(); // a plain GET
  });

  it("creates an item with a JSON body", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: 7, sku: "A" }));

    await clientWith(fetchMock as unknown as typeof fetch).createItem({ sku: "A", name: "Alpha", quantity: 2 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ sku: "A", name: "Alpha", quantity: 2 });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("turns an error response into an ApiError carrying the status and detail", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(409, { detail: "An item with this SKU already exists" }));

    const failure = await clientWith(fetchMock as unknown as typeof fetch)
      .createItem({ sku: "A", name: "x", quantity: 0 })
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(409);
    expect((failure as ApiError).detail).toBe("An item with this SKU already exists");
  });

  it("copes with an error body that is not JSON (an HTML 503 page from Azure)", async () => {
    const fetchMock = vi.fn(async () => new Response("<html>503</html>", { status: 503 }));

    const failure = await clientWith(fetchMock as unknown as typeof fetch).listItems().catch((e: unknown) => e);

    expect((failure as ApiError).status).toBe(503);
  });

  it("reports a network failure as status 0", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    const failure = await clientWith(fetchMock as unknown as typeof fetch).listItems().catch((e: unknown) => e);

    expect((failure as ApiError).status).toBe(0);
  });

  it("asks for a fresh token on every request", async () => {
    const getToken = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
    const fetchMock = vi.fn(async () => jsonResponse(200, []));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await client.listItems();
    await client.listItems();

    const auth = fetchMock.mock.calls.map((c) => ((c as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization);
    expect(auth).toEqual(["Bearer first", "Bearer second"]);
  });

  it("does not call the API if getting a token fails", async () => {
    const fetchMock = vi.fn();
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getToken: async () => {
        throw new ApiError(401, "Not signed in");
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(client.listItems()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("describeError", () => {
  it.each([
    [0, /can't reach/i],
    [401, /sign in again/i],
    [403, /permission/i],
    [409, /already exists/i],
    [503, /starting up/i],
    [500, /code 500/i],
  ])("explains status %i in plain words", (status, pattern) => {
    expect(describeError(new ApiError(status, "x"))).toMatch(pattern);
  });

  it("lists the fields the API rejected for a 422", () => {
    const detail = [{ loc: ["body", "quantity"], msg: "Input should be greater than or equal to 0" }];

    expect(describeError(new ApiError(422, "x", detail))).toBe("quantity: Input should be greater than or equal to 0");
  });

  it("never leaks technical details for unknown errors", () => {
    expect(describeError(new Error("secret internals"))).not.toMatch(/secret/);
  });
});
