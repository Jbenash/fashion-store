import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import {
  formatDateTime,
  formatPrice,
  STATUS_BLURB,
  STATUS_LABEL,
  STATUS_TONE,
} from '../lib/format';
import { ErrorBox, Loading } from '../components/States';
import { CheckIcon } from '../components/Icons';
import type { OrderStatus } from '../lib/types';
import type { CSSProperties } from 'react';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const [params] = useSearchParams();
  const justPaid = params.get('payment') === 'return';

  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);

  // PayHere confirms server-to-server, so the status can lag the redirect by a
  // moment. Re-check a few times before telling the customer anything final.
  const [checks, setChecks] = useState(0);
  const awaitingPayment = justPaid && order?.status === 'PENDING' && checks < 5;

  useEffect(() => {
    if (!awaitingPayment) return;
    const t = window.setTimeout(() => {
      setChecks((n) => n + 1);
      reload();
    }, 3000);
    return () => window.clearTimeout(t);
  }, [awaitingPayment, checks, reload]);

  if (loading && !order) return <Loading label="Loading order" />;

  if (error || !order) {
    return (
      <div className="wrap page wrap-narrow">
        <ErrorBox message={error ?? 'Order not found.'} onRetry={reload} />
        <Link to="/account/orders" className="btn btn-outline" style={{ marginTop: 18 }}>
          Back to my orders
        </Link>
      </div>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  // PAID is a parallel entry point to CONFIRMED in the backend state machine.
  const reached = order.status === 'PAID' ? 1 : FLOW.indexOf(order.status);

  return (
    <div className="wrap page wrap-mid">
      {justPaid && (
        <div
          className={`alert ${awaitingPayment ? 'alert-info' : order.status === 'PENDING' ? 'alert-warn' : 'alert-ok'}`}
          style={{ marginBottom: 24 }}
        >
          {awaitingPayment
            ? 'Confirming your payment with PayHere…'
            : order.status === 'PENDING'
              ? 'We have not received payment confirmation yet. If you completed the payment it may take a few minutes — refresh this page shortly.'
              : 'Payment confirmed. Thank you for your order.'}
        </div>
      )}

      <div className="page-head row row-between row-wrap">
        <div>
          <span className="eyebrow">Order</span>
          <h1 className="mono">{order.orderNumber}</h1>
          <p className="muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`badge ${STATUS_TONE[order.status]}`} style={{ fontSize: 12, padding: '6px 13px' }}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="split">
        <div className="stack" style={{ '--gap': '22px' } as CSSProperties}>
          <div className="panel">
            <div className="panel-head">
              <strong>Items</strong>
              <span className="small muted">
                {order.items?.reduce((n, i) => n + i.quantity, 0)} pieces
              </span>
            </div>
            <div className="panel-body">
              {order.items?.map((i) => (
                <div
                  key={i.id}
                  className="row row-between"
                  style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}
                >
                  <div>
                    <div className="bold">{i.productName}</div>
                    <div className="tiny muted">
                      {i.colour} / {i.size} × {i.quantity}
                    </div>
                  </div>
                  <div className="right">
                    <div className="mono">{formatPrice(i.unitPrice * i.quantity)}</div>
                    <div className="tiny muted mono">{formatPrice(i.unitPrice)} each</div>
                  </div>
                </div>
              ))}

              <div className="row row-between" style={{ paddingTop: 16 }}>
                <strong>Total</strong>
                <strong className="mono">{formatPrice(order.total)}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <strong>Progress</strong>
            </div>
            <div className="panel-body">
              {cancelled ? (
                <div className="timeline">
                  <div className="tl-step tl-cancel">
                    <span className="tl-dot">✕</span>
                    <div>
                      <strong>Cancelled</strong>
                      <p className="small muted">{STATUS_BLURB.CANCELLED}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="timeline">
                  {FLOW.map((s, idx) => {
                    const done = idx <= reached;
                    const label = idx === 1 && order.status === 'PAID' ? 'Paid' : STATUS_LABEL[s];
                    return (
                      <div key={s} className={`tl-step${done ? ' tl-done' : ''}`}>
                        <span className="tl-dot">{done ? <CheckIcon size={12} /> : idx + 1}</span>
                        <div>
                          <strong>{label}</strong>
                          {idx === reached && (
                            <p className="small muted">{STATUS_BLURB[order.status]}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="summary stack" style={{ '--gap': '22px' } as CSSProperties}>
          <div className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Delivery</h3>
            <dl className="kv">
              <dt>Name</dt>
              <dd>{order.customerName}</dd>
              <dt>Phone</dt>
              <dd>{order.phone}</dd>
              <dt>Email</dt>
              <dd style={{ wordBreak: 'break-word' }}>{order.email}</dd>
              <dt>Address</dt>
              <dd>
                {order.address}
                <br />
                {order.city}
              </dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Payment</h3>
            <dl className="kv">
              <dt>Method</dt>
              <dd>{order.paymentMethod === 'PAYHERE' ? 'Card (PayHere)' : 'WhatsApp'}</dd>
              <dt>Status</dt>
              <dd>{STATUS_LABEL[order.status]}</dd>
              {order.paymentRef && (
                <>
                  <dt>Reference</dt>
                  <dd className="mono">{order.paymentRef}</dd>
                </>
              )}
            </dl>
          </div>

          <Link to="/account/orders" className="btn btn-outline btn-block">
            Back to my orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
