import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../store/auth';
import { formatDate, formatPrice, STATUS_LABEL, STATUS_TONE } from '../lib/format';
import { Empty, ErrorBox, RowsSkeleton } from '../components/States';

export default function MyOrders() {
  const { user, logout } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.myOrders(), []);
  const orders = data ?? [];

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
                      <Link to={`/orders/${o.id}`} className="link-underline small">
                        View
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
