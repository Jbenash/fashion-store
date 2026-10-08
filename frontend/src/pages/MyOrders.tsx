import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage, useAsync } from '../lib/useAsync';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import { formatDate, formatPrice, STATUS_LABEL, STATUS_TONE } from '../lib/format';
import { Empty, ErrorBox, RowsSkeleton } from '../components/States';
import type { CSSProperties } from 'react';

export default function MyOrders() {
  const { user, logout } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const orders = data ?? [];

  const cancel = async (id: number) => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api.cancelOrder(id);
      toast.push('Order cancelled and stock released.', 'ok');
      reload();
    } catch (e) {
      toast.push(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="wrap page wrap-mid">
      <div className="page-head row row-between row-wrap">
        <div>
          <span className="eyebrow">Account</span>
          <h1>My orders</h1>
          <p className="muted">
            Signed in as {user?.name} · {user?.email}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel">
        {loading && <RowsSkeleton />}

        {!loading && !error && orders.length === 0 && (
          <Empty
            title="No orders yet"
            message="When you place an order it will appear here with live status."
            action={
              <Link to="/products" className="btn">
                Start shopping
              </Link>
            }
          />
        )}

        {!loading && orders.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="cell-tight" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="bold mono">{o.orderNumber}</td>
                    <td className="muted">{formatDate(o.createdAt)}</td>
                    <td className="muted">
                      {o.items?.reduce((n, i) => n + i.quantity, 0) ?? 0}
                    </td>
                    <td className="mono">{formatPrice(o.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="cell-tight">
                      <div className="row" style={{ '--row-gap': '8px' } as CSSProperties}>
                        <Link to={`/orders/${o.id}`} className="link-underline small">
                          View
                        </Link>
                        {o.status === 'PENDING' && (
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--danger)' }}
                            disabled={busyId === o.id}
                            onClick={() => cancel(o.id)}
                          >
                            {busyId === o.id ? <span className="spinner" /> : 'Cancel'}
                          </button>
                        )}
                      </div>
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
