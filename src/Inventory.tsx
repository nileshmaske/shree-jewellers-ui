import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Package, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { formatINR } from './format';
import { Modal } from './Modal';

export type StockStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DAMAGED';
export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  grossWeight: number;
  netWeight: number;
  stoneWeight: number;
  makingCharges: number;
  sellingPrice: number;
  stockStatus: StockStatus;
};
type InventorySummary = {
  totalProducts: number;
  availableProducts: number;
  reservedProducts: number;
  soldProducts: number;
  damagedProducts: number;
};
type ProductInput = Omit<Product, 'id'>;

const initial: ProductInput = {
  sku: '', name: '', category: '', metal: 'Gold', purity: '22K',
  grossWeight: 0, netWeight: 0, stoneWeight: 0, makingCharges: 0, sellingPrice: 0,
  stockStatus: 'AVAILABLE',
};
const textFields = [
  { key: 'sku', label: 'SKU', maxLength: 60 },
  { key: 'name', label: 'Product name', maxLength: 160 },
  { key: 'category', label: 'Category', maxLength: 80 },
] as const;
const numericFields = [
  { key: 'grossWeight', label: 'Gross weight (g)', step: '0.001' },
  { key: 'netWeight', label: 'Net weight (g)', step: '0.001' },
  { key: 'stoneWeight', label: 'Stone weight (g)', step: '0.001' },
  { key: 'makingCharges', label: 'Making charges (₹)', step: '0.01' },
  { key: 'sellingPrice', label: 'Selling price (₹)', step: '0.01' },
] as const;
const stockStatuses = ['AVAILABLE', 'RESERVED', 'SOLD', 'DAMAGED'] as const;

export async function inventoryRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api/inventory' + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your token is invalid or expired. Please sign out and log in again.');
    if (response.status === 403) throw new Error('You do not have permission to perform this action.');
    let detail = '';
    try {
      const data = await response.json();
      detail = data.detail || data.message || data.title || '';
    } catch {}
    throw new Error(detail || `Inventory request failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function useInventorySummary(token: string) {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      setSummary(await inventoryRequest<InventorySummary>('/summary', token));
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load inventory.');
    }
  }, [token]);
  useEffect(() => { void reload(); }, [reload]);
  return { summary, error, reload };
}

export function Inventory({ token, roles, onChanged }: { token: string; roles: string[]; onChanged: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductInput>(initial);
  const [search, setSearch] = useState('');
  const canEdit = roles.some(role => ['ADMIN', 'MANAGER', 'ROLE_ADMIN', 'ROLE_MANAGER'].includes(role));

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError('');
    try {
      const data = await inventoryRequest<{ content: Product[]; totalPages: number; totalElements: number }>(`/products?page=${page}&size=10`, token);
      if (version !== requestVersion.current) return;
      setProducts(data.content);
      setTotalPages(data.totalPages);
      setTotal(data.totalElements);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setLoadError(error instanceof Error ? error.message : 'Failed to load products.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  function openForm(product?: Product) {
    setEditing(product?.id ?? null);
    if (product) {
      const { id, ...details } = product;
      setForm(details);
    } else {
      setForm({ ...initial });
    }
    setFormError('');
    setShowForm(true);
  }

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = [form.grossWeight, form.netWeight, form.stoneWeight, form.makingCharges, form.sellingPrice];
    if (values.some(value => !Number.isFinite(value) || value < 0)) {
      setFormError('Enter valid, non-negative weights and prices.');
      return;
    }
    if (form.netWeight <= 0 || form.grossWeight <= 0 || form.netWeight + form.stoneWeight > form.grossWeight + 0.001) {
      setFormError('Gross and net weights must be positive, and net plus stone weight must not exceed gross weight.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await inventoryRequest<Product>(editing === null ? '/products' : `/products/${editing}`, token, {
        method: editing === null ? 'POST' : 'PUT',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      if (page === 0) await load();
      else setPage(0);
      onChanged();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = products.filter(product =>
    [product.name, product.sku, product.category, product.metal].some(value => value.toLowerCase().includes(query)),
  );

  return (
    <section aria-labelledby="inventory-title">
      <div className="page-heading">
        <div>
          <h1 id="inventory-title">Inventory</h1>
          <p>Manage jewellery, pricing and stock status.</p>
        </div>
        <div className="button-group">
          <button className="button button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
          {canEdit && <button className="button button-primary" onClick={() => openForm()} disabled={saving}><Plus size={18} aria-hidden="true" /> Add product</button>}
        </div>
      </div>

      <div className="surface table-panel">
        <div className="panel-heading">
          <div>
            <h2>Product catalogue</h2>
            {!loadError && <p>{total} {total === 1 ? 'product' : 'products'}</p>}
          </div>
          <label className="field-with-icon filter-field">
            <Search size={17} aria-hidden="true" />
            <input aria-label="Filter products on this page" placeholder="Filter this page" value={search} onChange={e => setSearch(e.target.value)} />
          </label>
        </div>
        {loadError && <p className="alert alert-error table-alert" role="alert">{loadError}</p>}
        {loading ? <p className="loading-state" role="status">Loading inventory…</p>
          : loadError ? null
          : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Package size={25} aria-hidden="true" /></span>
              <strong>{products.length ? 'No matching products on this page' : 'No products in inventory'}</strong>
              {products.length === 0 && canEdit && <button className="button button-secondary" onClick={() => openForm()} disabled={saving}>Add your first product</button>}
            </div>
          ) : (
            <div className="table-scroll" role="region" aria-label="Inventory products" tabIndex={0}>
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Metal / purity</th>
                    <th scope="col" className="numeric">Net weight</th>
                    <th scope="col" className="numeric">Selling price</th>
                    <th scope="col">Status</th>
                    {canEdit && <th scope="col"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(product => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong><small>{product.category}</small></td>
                      <td className="sku-cell">{product.sku}</td>
                      <td>{product.metal} / {product.purity}</td>
                      <td className="numeric">{product.netWeight.toFixed(3)} g</td>
                      <td className="numeric"><strong>{formatINR(product.sellingPrice)}</strong></td>
                      <td><span className={`status-pill status-${product.stockStatus.toLowerCase()}`}>{product.stockStatus.toLowerCase()}</span></td>
                      {canEdit && <td><button className="icon-button table-action" aria-label={`Edit ${product.name}`} title="Edit product" disabled={saving} onClick={() => openForm(product)}><Pencil size={16} aria-hidden="true" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div className="pagination table-pagination">
          <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
          <div className="button-group">
            <button className="button button-secondary button-small" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15} aria-hidden="true" /> Previous</button>
            <button className="button button-secondary button-small" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={15} aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      {showForm && (
        <Modal title={editing === null ? 'Add product' : 'Edit product'} busy={saving} onClose={() => setShowForm(false)}>
          <form onSubmit={save}>
            <div className="form-grid">
              {textFields.map(({ key, label, maxLength }) => (
                <label key={key}>{label}<input required maxLength={maxLength} value={form[key]} onChange={e => update(key, e.target.value)} /></label>
              ))}
              <label>Metal<select value={form.metal} onChange={e => update('metal', e.target.value)}><option>Gold</option><option>Silver</option><option>Platinum</option><option>Other</option></select></label>
              <label>Purity<input required maxLength={30} value={form.purity} onChange={e => update('purity', e.target.value)} /></label>
              <label>Stock status
                <select value={form.stockStatus} onChange={e => update('stockStatus', e.target.value as StockStatus)}>
                  {stockStatuses.map(status => <option key={status} value={status}>{status[0] + status.slice(1).toLowerCase()}</option>)}
                </select>
              </label>
              {numericFields.map(({ key, label, step }) => (
                <label key={key}>{label}<input type="number" required min="0" step={step} value={form[key]} onChange={e => update(key, Number(e.target.value))} /></label>
              ))}
            </div>
            {formError && <p className="alert alert-error" role="alert">{formError}</p>}
            <footer className="modal-actions button-group">
              <button className="button button-secondary" type="button" disabled={saving} onClick={() => setShowForm(false)}>Cancel</button>
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editing === null ? 'Create product' : 'Save changes'}</button>
            </footer>
          </form>
        </Modal>
      )}
    </section>
  );
}
