import { describe, expect, it } from "vitest";
import { validateItem } from "./validation";

const ok = { sku: "BOLT-1", name: "Hex bolt", quantity: "25" };

describe("validateItem", () => {
  it("accepts good input and returns the cleaned item", () => {
    const result = validateItem({ sku: "  BOLT-1  ", name: " Hex bolt ", quantity: " 25 " });

    expect(result.errors).toEqual({});
    expect(result.item).toEqual({ sku: "BOLT-1", name: "Hex bolt", quantity: 25 });
  });

  it("accepts a quantity of zero", () => {
    expect(validateItem({ ...ok, quantity: "0" }).item?.quantity).toBe(0);
  });

  it.each([
    ["", "sku"],
    ["   ", "sku"],
    ["x".repeat(51), "sku"],
  ])("rejects the SKU %j", (sku, field) => {
    const result = validateItem({ ...ok, sku });

    expect(result.item).toBeUndefined();
    expect(result.errors).toHaveProperty(field);
  });

  it.each(["", "  ", "x".repeat(201)])("rejects the name %j", (name) => {
    expect(validateItem({ ...ok, name }).errors).toHaveProperty("name");
  });

  it.each(["", "-1", "1.5", "abc", "1e3", "12 3", "99999999999"])("rejects the quantity %j", (quantity) => {
    const result = validateItem({ ...ok, quantity });

    expect(result.item).toBeUndefined();
    expect(result.errors).toHaveProperty("quantity");
  });

  it("reports every problem at once", () => {
    const result = validateItem({ sku: "", name: "", quantity: "x" });

    expect(Object.keys(result.errors).sort()).toEqual(["name", "quantity", "sku"]);
  });
});
