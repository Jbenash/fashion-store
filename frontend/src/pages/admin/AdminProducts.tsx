import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/useAsync';
import { useToast } from '../../store/toast';
import { formatPrice, imageOf, totalStock } from '../../lib/format';
import { Empty, ErrorBox, RowsSkeleton } from '../../components/States';
import type { CSSProperties } from 'react';

export default function AdminProducts() {
  const { data, loading, error, reload } = useAsync(() => api.adminProducts(), []);
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  const products = useMemo(() => {
    const list = data ?? [];
    const q = filter.trim().toLowerCase();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [data, filter]);

  const toggleActive = async (id: number, isActive: boolean) => {
    setBusyId(id);
    try {
      if (isActive) {
        await api.deactivateProduct(id);
        toast.push('Product hidden from the storefront.', 'ok');
      } else {
        await api.updateProduct(id, { isActive: true });
        toast.push('Product is live again.', 'ok');
      }
      reload();
    } catch (e) {
      toast.push(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack" style={{ '--gap': '20px' } as CSSProperties}>
      <div className="row row-between row-wrap">
        <input
          className="input"
          style={{ maxWidth: 280 }}
          type="search"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter products"
        />
        <Link to="/admin/products/new" className="btn">
          New product
        </Link>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel">
        {loading && <RowsSkeleton />}

        {!loading && products.length === 0 && (
          <Empty
            title={filter ? 'No products match' : 'No products yet'}
            message={filter ? 'Try a different search.' : 'Add your first piece to get started.'}
            action={
              !filter && (
                <Link to="/admin/products/new" className="btn">
                  New product
                </Link>
              )
            }
          />
        )}

        {!loading && products.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th colSpan={2}>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Bulk</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="cell-tight" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const stock = totalStock(p);
                  return (
                    <tr key={p.id}>
                      <td className="cell-tight">
                        <img className="thumb-xs" src={imageOf(p)} alt="" loading="lazy" />
                      </td>
                      <td>
                        <Link to={`/admin/products/${p.id}`} className="bold link-underline">
                          {p.name}
                        </Link>
                        <div className="tiny muted">{p.variants?.length ?? 0} variants</div>
                      </td>
                      <td className="muted">{p.category?.name}</td>
                      <td className="mono">{formatPrice(p.price)}</td>
                      <td className="mono muted">
                        {p.bulkMinQty && p.bulkPrice
                          ? `${formatPrice(p.bulkPrice)} @ ${p.bulkMinQty}+`
                          : '—'}
                      </td>
                      <td>
                        <span
                          className={`badge ${stock === 0 ? 'badge-danger' : stock <= 5 ? 'badge-warn' : ''}`}
                        >
                          {stock}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.isActive ? 'badge-ok' : ''}`}>
                          {p.isActive ? 'Live' : 'Hidden'}
                        </span>
                      </td>
                      <td className="cell-tight">
                        <div className="row" style={{ '--row-gap': '6px' } as CSSProperties}>
                          <Link to={`/admin/products/${p.id}`} className="btn btn-sm btn-outline">
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => toggleActive(p.id, p.isActive)}
                            disabled={busyId === p.id}
                          >
                            {p.isActive ? 'Hide' : 'Restore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="hint">
        Products are never deleted, because past orders reference their variants.
        Hiding a product removes it from the storefront while keeping order history intact.
      </p>
    </div>
  );
}
