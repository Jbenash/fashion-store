import { Link } from 'react-router-dom';
import { useCart } from '../store/cart';
import { formatPrice, imageOf } from '../lib/format';
import { Empty } from '../components/States';
import { ArrowIcon, TrashIcon } from '../components/Icons';

export default function Cart() {
  const { priced, subtotal, savings, count, setQuantity, remove } = useCart();

  if (priced.length === 0) {
    return (
      <div className="wrap page">
        <Empty
          title="Your bag is empty"
          message="Once you add a piece it will show up here, with any bulk pricing applied."
          action={
            <Link to="/products" className="btn">
              Start shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="wrap page">
      <div className="page-head">
        <span className="eyebrow">Step 1 of 2</span>
        <h1>Your bag</h1>
        <p className="muted">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="split">
        <div>
          {priced.map((l) => (
            <div key={l.variantId} className="line-item">
              <Link to={`/products/${l.productId}`} className="line-thumb">
                <img src={imageOf(l)} alt={l.name} loading="lazy" />
              </Link>

              <div>
                <Link to={`/products/${l.productId}`}>
                  <strong>{l.name}</strong>
                </Link>
                <p className="small muted" style={{ margin: '3px 0 10px' }}>
                  {l.colour} · Size {l.size}
                </p>

                <div className="row row-wrap">
                  <div className="qty">
                    <button
                      onClick={() => setQuantity(l.variantId, l.quantity - 1)}
                      aria-label={`Decrease quantity of ${l.name}`}
                    >
                      −
                    </button>
                    <span>{l.quantity}</span>
                    <button
                      onClick={() => setQuantity(l.variantId, l.quantity + 1)}
                      disabled={l.quantity >= l.stock}
                      aria-label={`Increase quantity of ${l.name}`}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => remove(l.variantId)}
                    aria-label={`Remove ${l.name}`}
                  >
                    <TrashIcon /> Remove
                  </button>
                </div>

                {l.quantity >= l.stock && (
                  <p className="hint" style={{ color: 'var(--warn)' }}>
                    Only {l.stock} available.
                  </p>
                )}
              </div>

              <div className="right">
                <div className="bold mono">{formatPrice(l.lineTotal)}</div>
                <div className="tiny muted mono">{formatPrice(l.unitPrice)} each</div>
                {l.bulk && (
                  <span className="badge badge-accent" style={{ marginTop: 6 }}>
                    Bulk
                  </span>
                )}
              </div>
            </div>
          ))}

          <Link
            to="/products"
            className="link-underline small"
            style={{ display: 'inline-block', marginTop: 22 }}
          >
            ← Continue shopping
          </Link>
        </div>

        <aside className="summary">
          <div className="card card-pad">
            <h3 style={{ marginBottom: 18 }}>Order summary</h3>

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

            <Link to="/checkout" className="btn btn-lg btn-block" style={{ marginTop: 20 }}>
              Checkout <ArrowIcon />
            </Link>

            <p className="hint center" style={{ marginTop: 12 }}>
              Final pricing and stock are confirmed by our server at checkout.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
