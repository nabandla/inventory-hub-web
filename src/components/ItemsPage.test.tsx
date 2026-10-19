import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient, type Item } from "../api";
import { ItemsPage } from "./ItemsPage";

const item = (over: Partial<Item> = {}): Item => ({
  id: 1,
  sku: "BOLT-1",
  name: "Hex bolt",
  quantity: 25,
  created_at: "2026-10-19T10:00:00",
  updated_at: "2026-10-19T10:00:00",
  ...over,
});

function fakeApi(over: Partial<ApiClient> = {}): ApiClient {
  return {
    listItems: vi.fn().mockResolvedValue([]),
    createItem: vi.fn().mockResolvedValue(item()),
    ...over,
  };
}

async function addItem(sku = "BOLT-1", name = "Hex bolt") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("SKU"), sku);
  await user.type(screen.getByLabelText("Name"), name);
  await user.click(screen.getByRole("button", { name: "Save" }));
}

describe("ItemsPage", () => {
  it("shows the items the API returns", async () => {
    const api = fakeApi({ listItems: vi.fn().mockResolvedValue([item(), item({ id: 2, sku: "NUT-1", name: "Nut" })]) });

    render(<ItemsPage api={api} onSessionExpired={vi.fn()} />);

    expect(await screen.findByText("BOLT-1")).toBeInTheDocument();
    expect(screen.getByText("NUT-1")).toBeInTheDocument();
  });

  it("says so when there are no items yet", async () => {
    render(<ItemsPage api={fakeApi()} onSessionExpired={vi.fn()} />);

    expect(await screen.findByText(/no items yet/i)).toBeInTheDocument();
  });

  it("saves, confirms, and reloads the list from the server", async () => {
    const listItems = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([item()]);
    const createItem = vi.fn().mockResolvedValue(item());
    render(<ItemsPage api={fakeApi({ listItems, createItem })} onSessionExpired={vi.fn()} />);
    await screen.findByText(/no items yet/i);

    await addItem();

    expect(createItem).toHaveBeenCalledWith({ sku: "BOLT-1", name: "Hex bolt", quantity: 0 });
    expect(await screen.findByText('Saved "BOLT-1".')).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "BOLT-1" })).toBeInTheDocument();
    expect(listItems).toHaveBeenCalledTimes(2);
  });

  it.each([
    [409, /already exists/i],
    [403, /permission/i],
    [503, /starting up/i],
    [0, /can't reach/i],
  ])("shows a plain message when saving fails with status %i", async (status, message) => {
    const createItem = vi.fn().mockRejectedValue(new ApiError(status, "x"));
    render(<ItemsPage api={fakeApi({ createItem })} onSessionExpired={vi.fn()} />);
    await screen.findByText(/no items yet/i);

    await addItem();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toHaveValue("BOLT-1"); // the user's input is kept
  });

  it("asks for a new sign-in when the API answers 401", async () => {
    const onSessionExpired = vi.fn();
    const createItem = vi.fn().mockRejectedValue(new ApiError(401, "x"));
    render(<ItemsPage api={fakeApi({ createItem })} onSessionExpired={onSessionExpired} />);
    await screen.findByText(/no items yet/i);

    await addItem();

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/sign in again/i)).toBeInTheDocument();
  });

  it("shows a load failure with a working Try again button", async () => {
    const listItems = vi.fn().mockRejectedValueOnce(new ApiError(503, "x")).mockResolvedValueOnce([item()]);
    render(<ItemsPage api={fakeApi({ listItems })} onSessionExpired={vi.fn()} />);

    expect(await screen.findByText(/starting up/i)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("BOLT-1")).toBeInTheDocument();
    expect(screen.queryByText(/starting up/i)).not.toBeInTheDocument();
  });

  it("does not send two requests when Save is clicked twice quickly", async () => {
    let finish: (value: Item) => void = () => {};
    const createItem = vi.fn().mockReturnValue(new Promise<Item>((resolve) => (finish = resolve)));
    render(<ItemsPage api={fakeApi({ createItem })} onSessionExpired={vi.fn()} />);
    await screen.findByText(/no items yet/i);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("SKU"), "BOLT-1");
    await user.type(screen.getByLabelText("Name"), "Hex bolt");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Saving…" }));

    expect(createItem).toHaveBeenCalledTimes(1);
    finish(item());
    await screen.findByText('Saved "BOLT-1".');
  });
});
