import type { NewItem } from "./api";

export type FormValues = { sku: string; name: string; quantity: string };
export type FormErrors = Partial<Record<keyof FormValues, string>>;

// The API enforces the same rules (and the database is the last line of defence). Checking here
// only saves the user a round trip; it never replaces the server's checks.
export const LIMITS = { skuMax: 50, nameMax: 200, quantityMax: 2_147_483_647 };

export function validateItem(values: FormValues): { errors: FormErrors; item?: NewItem } {
  const errors: FormErrors = {};
  const sku = values.sku.trim();
  const name = values.name.trim();
  const quantityText = values.quantity.trim();

  if (!sku) errors.sku = "Enter a SKU.";
  else if (sku.length > LIMITS.skuMax) errors.sku = `The SKU can have at most ${LIMITS.skuMax} characters.`;

  if (!name) errors.name = "Enter a name.";
  else if (name.length > LIMITS.nameMax) errors.name = `The name can have at most ${LIMITS.nameMax} characters.`;

  let quantity = 0;
  if (quantityText === "") {
    errors.quantity = "Enter a quantity (0 or more).";
  } else if (!/^\d+$/.test(quantityText)) {
    errors.quantity = "The quantity must be a whole number, 0 or more.";
  } else {
    quantity = Number(quantityText);
    if (quantity > LIMITS.quantityMax) errors.quantity = "That quantity is too large.";
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, item: { sku, name, quantity } };
}
