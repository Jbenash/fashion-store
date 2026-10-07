import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage, useAsync } from '../../lib/useAsync';
import { useToast } from '../../store/toast';
import {
  formatDateTime,
  formatPrice,
  STATUS_LABEL,
  STATUS_TONE,
  TRANSITIONS,
} from '../../lib/format';
import { ErrorBox, Loading } from '../../components/States';
import type { OrderStatus } from '../../lib/types';
import type { CSSProperties } from 'react';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const toast = useToast();
  const [busy, setBusy] = useState<OrderStatus | null>(null);

  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);

  if (loading && !order) return <Loading label="Loading order" />;

  if (error || !order) {
    return (
      <div className="stack">
        <ErrorBox message={error ?? 'Order not found.'} onRetry={reload} />
        <Link to="/admin/orders" className="btn btn-outline">
          Back to orders
        </Link>
      </div>
    );
  }

  const next = TRANSITIONS[order.status];

  // The server refuses to confirm a PayHere order by hand — the gateway does it.
  const blockedConfirm = order.paymentMethod === 'PAYHERE' && order.status === 'PENDING';

  const move = async (status: OrderStatus) => {
    if (
      status === 'CANCELLED' &&
      !window.confirm('Cancel this order? Stock will be returned to inventory.')
    ) {
      return;
    }
    setBusy(status);
    try {
      await api.updateOrderStatus(orderId, status);
      toast.push(`Order marked ${STATUS_LABEL[status].toLowerCase()}.`, 'ok');
      reload();
    } catch (e) {
      toast.push(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="stack" style={{ '--gap': '22px' } as CSSProperties}>
      <div className="row row-between row-wrap">
        <div>
          <h2 className="mono" style={{ fontSize: '1.5rem' }}>
            {order.orderNumber}
          </h2>
          <p className="small muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <Link to="/admin/orders" className="link-underline small">
          ← Back to orders
        </Link>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>Status</strong>
          <span className={`badge ${STATUS_TONE[order.status]}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
        <div className="panel-body">
          {next.length === 0 ? (
            <p className="small muted">
              This order has reached a final state. No further changes are possible.
            </p>
          ) : (
            <>
              <p className="small muted" style={{ marginBottom: 14 }}>
                Move this order to:
              </p>
              <div className="row row-wrap">
                {next.map((s) => {
                  const disabled = busy !== null || (s === 'CONFIRMED' && blockedConfirm);
                  return (
                    <button
                      key={s}
                      className={`btn ${s === 'CANCELLED' ? 'btn-danger' : ''}`}
                      onClick={() => move(s)}
                      disabled={disabled}
                      title={
                        s === 'CONFIRMED' && blockedConfirm
                          ? 'PayHere orders are confirmed automatically once payment clears'
                          : undefined
                      }
                    >
                      {busy === s ? <span className="spinner" /> : STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
              {blockedConfirm && (
                <p className="hint" style={{ marginTop: 12 }}>
                  This is a card order awaiting payment. PayHere confirms it
                  automatically — confirming by hand is blocked by the server.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-head">
            <strong>Items</strong>
          </div>
          <div className="table-scroll">
            <table className="table" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((i) => (
                  <tr key={i.id}>
                    <td className="bold">{i.productName}</td>
                    <td className="muted">
                      {i.colour} / {i.size}
                    </td>
                    <td className="mono">{i.quantity}</td>
                    <td className="mono">{formatPrice(i.unitPrice)}</td>
                    <td className="mono">{formatPrice(i.unitPrice * i.quantity)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="right bold">
                    Total
                  </td>
                  <td className="bold mono">{formatPrice(order.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="stack" style={{ '--gap': '22px' } as CSSProperties}>
          <div className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Customer</h3>
            <dl className="kv">
              <dt>Name</dt>
              <dd>{order.customerName}</dd>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${order.phone}`} className="link-underline">
                  {order.phone}
                </a>
              </dd>
              <dt>Email</dt>
              <dd style={{ wordBreak: 'break-word' }}>
                <a href={`mailto:${order.email}`} className="link-underline">
                  {order.email}
                </a>
              </dd>
              <dt>Account</dt>
              <dd>{order.user?.email ?? '—'}</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Shipping &amp; payment</h3>
            <dl className="kv">
              <dt>Address</dt>
              <dd>
                {order.address}
                <br />
                {order.city}
              </dd>
              <dt>Method</dt>
              <dd>{order.paymentMethod === 'PAYHERE' ? 'Card (PayHere)' : 'WhatsApp'}</dd>
              <dt>Reference</dt>
              <dd className="mono">{order.paymentRef ?? '—'}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
