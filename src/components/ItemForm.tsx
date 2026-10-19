import { useState, type FormEvent } from "react";
import type { NewItem } from "../api";
import { LIMITS, validateItem, type FormErrors, type FormValues } from "../validation";

type Props = {
  /** Resolves true when the item was saved (the form then clears), false when it was not. */
  onSave: (item: NewItem) => Promise<boolean>;
  saving: boolean;
};

const EMPTY: FormValues = { sku: "", name: "", quantity: "0" };

export function ItemForm({ onSave, saving }: Props) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});

  function change(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return; // a double click must not create two requests

    const result = validateItem(values);
    setErrors(result.errors);
    if (!result.item) return;

    const saved = await onSave(result.item);
    if (saved) setValues(EMPTY);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Add an item">
      <h2>Add an item</h2>

      <label htmlFor="sku">SKU</label>
      <input
        id="sku"
        value={values.sku}
        maxLength={LIMITS.skuMax}
        onChange={(e) => change("sku", e.target.value)}
        aria-invalid={Boolean(errors.sku)}
        aria-describedby={errors.sku ? "sku-error" : undefined}
        autoComplete="off"
      />
      {errors.sku && (
        <p id="sku-error" role="alert" className="field-error">
          {errors.sku}
        </p>
      )}

      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={values.name}
        maxLength={LIMITS.nameMax}
        onChange={(e) => change("name", e.target.value)}
        aria-invalid={Boolean(errors.name)}
        aria-describedby={errors.name ? "name-error" : undefined}
        autoComplete="off"
      />
      {errors.name && (
        <p id="name-error" role="alert" className="field-error">
          {errors.name}
        </p>
      )}

      <label htmlFor="quantity">Quantity</label>
      <input
        id="quantity"
        inputMode="numeric"
        value={values.quantity}
        onChange={(e) => change("quantity", e.target.value)}
        aria-invalid={Boolean(errors.quantity)}
        aria-describedby={errors.quantity ? "quantity-error" : undefined}
        autoComplete="off"
      />
      {errors.quantity && (
        <p id="quantity-error" role="alert" className="field-error">
          {errors.quantity}
        </p>
      )}

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
