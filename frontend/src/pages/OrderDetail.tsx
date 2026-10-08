import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage, useAsync } from '../lib/useAsync';
import { useToast } from '../store/toast';
import { useConfirm } from '../store/confirm';
import {
  formatDateTime,
  formatPrice,
  STATUS_BLURB,
  STATUS_LABEL,
  STATUS_TONE,
} from '../lib/format';
import { ErrorBox, Loading } from '../components/States';
import { CheckIcon, WhatsAppIcon } from '../components/Icons';
import type { OrderStatus } from '../lib/types';
import type { CSSProperties } from 'react';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const [params] = useSearchParams();
  const justPaid = params.get('payment') === 'return';

  const { data: order, loading, error, reload } = useAsync(() => api.order(orderId), [orderId]);

  // Rebuilt server-side, so the customer can still send it on a later visit.
  const whatsapp = useAsync(
    () =>
      order?.paymentMethod === 'WHATSAPP'
        ? api.orderWhatsapp(orderId).then((r) => r.url)
        : Promise.resolve(null),
    [orderId, order?.paymentMethod],
  );

  // PayHere confirms server-to-server, so the status can lag the redirect by a
  // moment. Re-check a few times before telling the customer anything final.
  const toast = useToast();
  const confirm = useConfirm();
  const [cancelling, setCancelling] = useState(false);
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

      {whatsapp.data && order.status === 'PENDING' && (
        <div className="card card-pad wa-panel" style={{ marginBottom: 24 }}>
          <div className="grow">
            <strong>One step left — send us your order</strong>
            <p className="small muted" style={{ marginTop: 4 }}>
              Your order is saved and the stock is reserved. Tap below to open
              WhatsApp with the details filled in, then press send so our team
              can confirm it.
            </p>
          </div>
          <a
            className="btn btn-lg"
            href={whatsapp.data}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> Send on WhatsApp
          </a>
        </div>
      )}

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

          {order.status === 'PENDING' && (
            <div className="card card-pad">
              <h3 style={{ marginBottom: 10 }}>Changed your mind?</h3>
              <p className="small muted" style={{ marginBottom: 14 }}>
                You can cancel while the order is still pending. The pieces go
                straight back into stock. Once it is confirmed or shipped you
                will need to contact us.
              </p>
              <button
                className="btn btn-danger btn-block"
                disabled={cancelling}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Cancel this order?',
                    message:
                      'The pieces go straight back into stock. This cannot be undone, and you would need to place a new order.',
                    confirmLabel: 'Cancel order',
                    cancelLabel: 'Keep it',
                    danger: true,
                  });
                  if (!ok) return;

                  setCancelling(true);
                  try {
                    await api.cancelOrder(orderId);
                    toast.push('Order cancelled and stock released.', 'ok');
                    reload();
                  } catch (e) {
                    toast.push(errorMessage(e), 'error');
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                {cancelling ? <span className="spinner" /> : 'Cancel this order'}
              </button>
            </div>
          )}

          <Link to="/account/orders" className="btn btn-outline btn-block">
            Back to my orders
          </Link>
        </aside>
      </div>
    </div>
  );
}
