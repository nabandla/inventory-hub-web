import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemForm } from "./ItemForm";

async function fill(sku: string, name: string, quantity?: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("SKU"), sku);
  await user.type(screen.getByLabelText("Name"), name);
  if (quantity !== undefined) {
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), quantity);
  }
  return user;
}

describe("ItemForm", () => {
  it("saves cleaned values and clears the form after a successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<ItemForm onSave={onSave} saving={false} />);

    const user = await fill("  A-1 ", " Alpha ", "5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ sku: "A-1", name: "Alpha", quantity: 5 });
    expect(screen.getByLabelText("SKU")).toHaveValue("");
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Quantity")).toHaveValue("0");
  });

  it("keeps what the user typed when the save fails, so nothing has to be retyped", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<ItemForm onSave={onSave} saving={false} />);

    const user = await fill("A-1", "Alpha", "5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("SKU")).toHaveValue("A-1");
    expect(screen.getByLabelText("Name")).toHaveValue("Alpha");
    expect(screen.getByLabelText("Quantity")).toHaveValue("5");
  });

  it("shows a message next to each invalid field and does not call the API", async () => {
    const onSave = vi.fn();
    render(<ItemForm onSave={onSave} saving={false} />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "-3");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a SKU.")).toBeInTheDocument();
    expect(screen.getByText("Enter a name.")).toBeInTheDocument();
    expect(screen.getByText(/whole number/i)).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toHaveAttribute("aria-invalid", "true");
  });

  it("disables Save while a save is in progress", () => {
    render(<ItemForm onSave={vi.fn()} saving />);

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
