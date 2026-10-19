import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, describeError, type ApiClient, type Item, type NewItem } from "../api";
import { ItemForm } from "./ItemForm";

type Props = {
  api: ApiClient;
  /** Called when the API says the sign-in is no longer valid (401). */
  onSessionExpired: () => void;
};

export function ItemsPage({ api, onSessionExpired }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleFailure = useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError && error.status === 401) onSessionExpired();
      return describeError(error);
    },
    [onSessionExpired],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api.listItems();
      if (mounted.current) setItems(list);
    } catch (error) {
      if (mounted.current) setLoadError(handleFailure(error));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [api, handleFailure]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(item: NewItem): Promise<boolean> {
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const created = await api.createItem(item);
      if (!mounted.current) return true;
      setNotice(`Saved "${created.sku}".`);
      await load(); // show what the server really holds, not what we assume
      return true;
    } catch (error) {
      if (mounted.current) setSaveError(handleFailure(error));
      return false;
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <div className="items-page">
      <ItemForm onSave={save} saving={saving} />
      {saveError && (
        <p role="alert" className="banner banner-error">
          {saveError}
        </p>
      )}
      {notice && (
        <p role="status" className="banner banner-ok">
          {notice}
        </p>
      )}

      <section aria-labelledby="items-heading">
        <h2 id="items-heading">Items</h2>
        {loading && <p role="status">Loading…</p>}
        {loadError && (
          <div role="alert" className="banner banner-error">
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        {!loading && !loadError && items.length === 0 && <p>No items yet. Add the first one above.</p>}
        {items.length > 0 && (
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Name</th>
                <th className="num">Quantity</th>
                <th>Created (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td className="num">{item.quantity}</td>
                  <td>{item.created_at.replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
