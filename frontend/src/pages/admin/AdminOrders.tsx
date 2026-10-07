import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatPrice, STATUS_LABEL, STATUS_TONE } from '../../lib/format';
import { Empty, ErrorBox, RowsSkeleton } from '../../components/States';
import type { OrderStatus } from '../../lib/types';
import type { CSSProperties } from 'react';

const FILTERS: (OrderStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'PAID',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export default function AdminOrders() {
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const { data, loading, error, reload } = useAsync(
    () => api.allOrders(status === 'ALL' ? undefined : status),
    [status],
  );

  const orders = data ?? [];

  return (
    <div className="stack" style={{ '--gap': '20px' } as CSSProperties}>
      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`chip${status === f ? ' chip-on' : ''}`}
            onClick={() => setStatus(f)}
            aria-pressed={status === f}
          >
            {f === 'ALL' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}

      <div className="panel">
        {loading && <RowsSkeleton />}

        {!loading && !error && orders.length === 0 && (
          <Empty
            title="No orders here"
            message={status === 'ALL' ? 'Orders will appear as customers check out.' : 'No orders with that status.'}
          />
        )}

        {!loading && orders.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Payment</th>
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
                    <td>
                      {o.customerName}
                      <div className="tiny muted">{o.city}</div>
                    </td>
                    <td className="muted nowrap">{formatDate(o.createdAt)}</td>
                    <td className="muted">{o.paymentMethod === 'PAYHERE' ? 'Card' : 'WhatsApp'}</td>
                    <td className="mono">{o.items?.reduce((n, i) => n + i.quantity, 0) ?? 0}</td>
                    <td className="mono">{formatPrice(o.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="cell-tight">
                      <Link to={`/admin/orders/${o.id}`} className="btn btn-sm btn-outline">
                        Manage
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
