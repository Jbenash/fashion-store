import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { errorMessage } from '../lib/useAsync';
import { payhereConfigured, submitPayhere } from '../lib/payhere';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { useToast } from '../store/toast';
import { formatPrice, imageOf } from '../lib/format';
import { Empty } from '../components/States';
import type { CreateOrderBody, PaymentMethod } from '../lib/types';
import type { CSSProperties } from 'react';

const PHONE_RE = /^(\+94|0)?7\d{8}$/;

type Errors = Partial<Record<keyof CreateOrderBody, string>>;

export default function Checkout() {
  const { priced, subtotal, savings, clear } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: user?.name ?? '',
    phone: '',
    email: user?.email ?? '',
    address: '',
    city: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAYHERE');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  if (priced.length === 0 && !submitting) {
    return (
      <div className="wrap page">
        <Empty
          title="Nothing to check out"
          message="Add a piece to your bag first."
          action={
            <Link to="/products" className="btn">
              Browse the shop
            </Link>
          }
        />
      </div>
    );
  }

  /** Mirrors CreateOrderDto so the user sees problems before the round trip. */
  const validate = (): boolean => {
    const next: Errors = {};
    if (!form.customerName.trim()) next.customerName = 'Enter the recipient name.';
    else if (form.customerName.length > 80) next.customerName = 'Name is too long.';

    if (!PHONE_RE.test(form.phone.trim()))
      next.phone = 'Enter a valid Sri Lankan mobile, e.g. 0771234567.';

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';

    if (!form.address.trim()) next.address = 'Enter a delivery address.';
    else if (form.address.length > 250) next.address = 'Address is too long.';

    if (!form.city.trim()) next.city = 'Enter a city.';
    else if (form.city.length > 60) next.city = 'City is too long.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async () => {
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const body: CreateOrderBody = {
        items: priced.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        paymentMethod,
      };

      const result = await api.createOrder(body);
      clear();

      if (paymentMethod === 'WHATSAPP' && result.whatsappUrl) {
        // Opened before navigating so the tab isn't blocked as a popup.
        window.open(result.whatsappUrl, '_blank', 'noopener');
        navigate(`/orders/${result.order.id}`, { replace: true });
        return;
      }

      if (payhereConfigured(result.payhere)) {
        submitPayhere(result.payhere!);
        return;
      }

      toast.push('Order placed, but the payment gateway is not configured.', 'info');
      navigate(`/orders/${result.order.id}`, { replace: true });
    } catch (e) {
      setServerError(errorMessage(e));
      setSubmitting(false);
    }
  };

  return (
    <div className="wrap page wrap-mid">
      <div className="steps">
        <Link to="/cart" className="step">
          <span className="step-dot">1</span> Bag
        </Link>
        <span className="steps-sep" />
        <span className="step step-on">
          <span className="step-dot">2</span> Details &amp; payment
        </span>
      </div>

      <div className="page-head">
        <h1>Checkout</h1>
      </div>

      <div className="split">
        <div className="stack" style={{ '--gap': '26px' } as CSSProperties}>
          {serverError && <div className="alert alert-error">{serverError}</div>}

          <section>
            <h3 style={{ marginBottom: 16 }}>Delivery details</h3>
            <div className="form-grid">
              <label className="field col-span">
                <span className="label">Full name</span>
                <input
                  className={`input${errors.customerName ? ' field-error' : ''}`}
                  value={form.customerName}
                  onChange={(e) => set('customerName')(e.target.value)}
                  autoComplete="name"
                />
                {errors.customerName && <span className="hint hint-error">{errors.customerName}</span>}
              </label>

              <label className="field">
                <span className="label">Mobile</span>
                <input
                  className={`input${errors.phone ? ' field-error' : ''}`}
                  value={form.phone}
                  onChange={(e) => set('phone')(e.target.value)}
                  placeholder="0771234567"
                  inputMode="tel"
                  autoComplete="tel"
                />
                {errors.phone && <span className="hint hint-error">{errors.phone}</span>}
              </label>

              <label className="field">
                <span className="label">Email</span>
                <input
                  className={`input${errors.email ? ' field-error' : ''}`}
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  autoComplete="email"
                />
                {errors.email && <span className="hint hint-error">{errors.email}</span>}
              </label>

              <label className="field col-span">
                <span className="label">Address</span>
                <textarea
                  className={`textarea${errors.address ? ' field-error' : ''}`}
                  value={form.address}
                  onChange={(e) => set('address')(e.target.value)}
                  placeholder="House number, street, area"
                  autoComplete="street-address"
                />
                {errors.address && <span className="hint hint-error">{errors.address}</span>}
              </label>

              <label className="field">
                <span className="label">City</span>
                <input
                  className={`input${errors.city ? ' field-error' : ''}`}
                  value={form.city}
                  onChange={(e) => set('city')(e.target.value)}
                  autoComplete="address-level2"
                />
                {errors.city && <span className="hint hint-error">{errors.city}</span>}
              </label>
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 16 }}>Payment</h3>
            <div className="choice-list">
              <label className={`choice${paymentMethod === 'PAYHERE' ? ' choice-on' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'PAYHERE'}
                  onChange={() => setPaymentMethod('PAYHERE')}
                />
                <span>
                  <span className="choice-title">Card payment via PayHere</span>
                  <span className="small muted" style={{ display: 'block' }}>
                    You will be redirected to PayHere's secure checkout. Visa,
                    Mastercard and local bank cards.
                  </span>
                </span>
              </label>

              <label className={`choice${paymentMethod === 'WHATSAPP' ? ' choice-on' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'WHATSAPP'}
                  onChange={() => setPaymentMethod('WHATSAPP')}
                />
                <span>
                  <span className="choice-title">Confirm on WhatsApp</span>
                  <span className="small muted" style={{ display: 'block' }}>
                    We open a pre-filled message with your order. Pay by bank
                    transfer or cash on delivery.
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="summary">
          <div className="card card-pad">
            <h3 style={{ marginBottom: 16 }}>Your order</h3>

            <div className="stack" style={{ '--gap': '12px', marginBottom: 18 } as CSSProperties}>
              {priced.map((l) => (
                <div key={l.variantId} className="row" style={{ '--row-gap': '11px' } as CSSProperties}>
                  <img
                    src={imageOf(l)}
                    alt=""
                    style={{ width: 44, height: 56, objectFit: 'cover', borderRadius: 3 }}
                  />
                  <div className="grow">
                    <div className="small bold">{l.name}</div>
                    <div className="tiny muted">
                      {l.colour} / {l.size} × {l.quantity}
                    </div>
                  </div>
                  <span className="small mono">{formatPrice(l.lineTotal)}</span>
                </div>
              ))}
            </div>

            <hr className="divider" style={{ marginBottom: 16 }} />

            <div className="totals">
              <div className="totals-row">
                <span className="muted">Subtotal</span>
                <span className="mono">{formatPrice(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="totals-row" style={{ color: 'var(--accent)' }}>
                  <span>Bulk savings</span>
                  <span className="mono">−{formatPrice(savings)}</span>
                </div>
              )}
              <div className="totals-row">
                <span className="muted">Island-wide delivery</span>
                <span className="mono">Free</span>
              </div>
              <div className="totals-row totals-total">
                <span>Total</span>
                <span className="mono">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <button
              className="btn btn-lg btn-block"
              style={{ marginTop: 20 }}
              onClick={placeOrder}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" /> Placing order
                </>
              ) : paymentMethod === 'PAYHERE' ? (
                'Pay now'
              ) : (
                'Place order'
              )}
            </button>

            <p className="hint center" style={{ marginTop: 12 }}>
              Stock is reserved only once the order is accepted by our server.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
