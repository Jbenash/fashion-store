import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import {
  formatDate,
  formatPrice,
  STATUS_LABEL,
  STATUS_TONE,
  totalStock,
} from '../../lib/format';
import { ErrorBox, RowsSkeleton } from '../../components/States';
import type { OrderStatus } from '../../lib/types';
import type { CSSProperties } from 'react';

const LOW_STOCK_AT = 5;

export default function Dashboard() {
  const orders = useAsync(() => api.allOrders(), []);
  const products = useAsync(() => api.adminProducts(), []);

  const stats = useMemo(() => {
    const list = orders.data ?? [];
    const live = list.filter((o) => o.status !== 'CANCELLED');
    const byStatus = {} as Record<OrderStatus, number>;
    for (const o of list) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

    return {
      revenue: live.reduce((sum, o) => sum + o.total, 0),
      orderCount: list.length,
      openCount: list.filter((o) =>
        ['PENDING', 'PAID', 'CONFIRMED'].includes(o.status),
      ).length,
      byStatus,
    };
  }, [orders.data]);

  const lowStock = useMemo(
    () =>
      (products.data ?? [])
        .filter((p) => p.isActive && totalStock(p) <= LOW_STOCK_AT)
        .sort((a, b) => totalStock(a) - totalStock(b)),
    [products.data],
  );

  const recent = (orders.data ?? []).slice(0, 6);

  return (
    <div className="stack" style={{ '--gap': '26px' } as CSSProperties}>
      {orders.error && <ErrorBox message={orders.error} onRetry={orders.reload} />}

      <div className="stat-grid">
        <div className="card stat">
          <div className="stat-label">Revenue</div>
          <div className="stat-value mono">{formatPrice(stats.revenue)}</div>
          <div className="stat-foot">Excludes cancelled orders</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Orders</div>
          <div className="stat-value mono">{stats.orderCount}</div>
          <div className="stat-foot">{stats.openCount} still open</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Active products</div>
          <div className="stat-value mono">
            {(products.data ?? []).filter((p) => p.isActive).length}
          </div>
          <div className="stat-foot">{(products.data ?? []).length} total</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Low stock</div>
          <div className="stat-value mono" style={{ color: lowStock.length ? 'var(--warn)' : undefined }}>
            {lowStock.length}
          </div>
          <div className="stat-foot">At or below {LOW_STOCK_AT} units</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Recent orders</strong>
          <Link to="/admin/orders" className="link-underline small">
            View all
          </Link>
        </div>

        {orders.loading && <RowsSkeleton rows={4} />}

        {!orders.loading && recent.length === 0 && (
          <div className="panel-body muted small">No orders yet.</div>
        )}

        {!orders.loading && recent.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`} className="link-underline bold mono">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td>{o.customerName}</td>
                    <td className="muted">{formatDate(o.createdAt)}</td>
                    <td className="mono">{formatPrice(o.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Needs restocking</strong>
          <Link to="/admin/products" className="link-underline small">
            Manage products
          </Link>
        </div>

        {products.loading && <RowsSkeleton rows={3} />}

        {!products.loading && lowStock.length === 0 && (
          <div className="panel-body muted small">
            Every active product has more than {LOW_STOCK_AT} units in stock.
          </div>
        )}

        {!products.loading && lowStock.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units left</th>
                  <th className="cell-tight" />
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="bold">{p.name}</td>
                    <td className="muted">{p.category?.name}</td>
                    <td>
                      <span className={`badge ${totalStock(p) === 0 ? 'badge-danger' : 'badge-warn'}`}>
                        {totalStock(p)}
                      </span>
                    </td>
                    <td className="cell-tight">
                      <Link to={`/admin/products/${p.id}`} className="link-underline small">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
