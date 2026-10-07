import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useCart } from '../store/cart';
import { useToast } from '../store/toast';
import {
  formatPrice,
  hasBulkTier,
  imageOf,
  swatchColor,
  unitPriceFor,
} from '../lib/format';
import { ErrorBox, Loading } from '../components/States';
import { ArrowIcon, CheckIcon } from '../components/Icons';
import type { CSSProperties } from 'react';

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const { add } = useCart();
  const toast = useToast();

  const { data: product, loading, error, reload } = useAsync(
    () => api.product(productId),
    [productId],
  );

  const [colour, setColour] = useState<string | null>(null);
  const [sizeName, setSizeName] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const colours = useMemo(
    () => [...new Set(product?.variants?.map((v) => v.colour) ?? [])],
    [product],
  );

  // Default to the first colour that actually has stock.
  const activeColour =
    colour ??
    colours.find((c) => product?.variants.some((v) => v.colour === c && v.stock > 0)) ??
    colours[0] ??
    null;

  const sizesForColour = useMemo(
    () => (product?.variants ?? []).filter((v) => v.colour === activeColour),
    [product, activeColour],
  );

  const variant = sizesForColour.find((v) => v.size === sizeName) ?? null;

  if (loading) return <Loading label="Loading product" />;

  if (error || !product) {
    return (
      <div className="wrap page wrap-narrow">
        <ErrorBox message={error ?? 'Product not found.'} onRetry={reload} />
        <Link to="/products" className="btn btn-outline" style={{ marginTop: 18 }}>
          Back to shop
        </Link>
      </div>
    );
  }

  const previewUnit = unitPriceFor(product, qty);
  const bulkActive = previewUnit < product.price;
  const maxQty = variant?.stock ?? 0;

  const onAdd = () => {
    if (!variant) {
      toast.push('Choose a size first.', 'error');
      return;
    }
    add(product, variant, qty);
    toast.push(`${product.name} (${variant.colour} / ${variant.size}) added to your bag.`, 'ok');
  };

  const onBuyNow = () => {
    if (!variant) {
      toast.push('Choose a size first.', 'error');
      return;
    }
    add(product, variant, qty);
    navigate('/cart');
  };

  return (
    <div className="wrap page">
      <nav className="small muted" style={{ marginBottom: 22 }}>
        <Link to="/products" className="link-underline">
          Shop
        </Link>
        <span aria-hidden> / </span>
        <Link to={`/products?categoryId=${product.category?.id}`} className="link-underline">
          {product.category?.name}
        </Link>
        <span aria-hidden> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="pdp">
        <div className="pdp-media">
          <img src={imageOf(product)} alt={product.name} />
        </div>

        <div>
          <span className="eyebrow">{product.category?.name}</span>
          <h1 style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', margin: '10px 0 14px' }}>
            {product.name}
          </h1>

          <div className="row row-wrap" style={{ marginBottom: 6 }}>
            <span className="pdp-price">{formatPrice(previewUnit)}</span>
            {bulkActive && <span className="strike">{formatPrice(product.price)}</span>}
            {bulkActive && <span className="badge badge-accent">Bulk price applied</span>}
          </div>

          <p className="small muted" style={{ marginBottom: 22 }}>
            Inclusive of taxes. Shipping calculated at checkout.
          </p>

          {hasBulkTier(product) && !bulkActive && (
            <div className="bulk-note" style={{ marginBottom: 22 }}>
              <strong style={{ flexShrink: 0 }}>Bulk</strong>
              <span>
                Order {product.bulkMinQty}+ of this product and the price drops to{' '}
                <strong>{formatPrice(product.bulkPrice!)}</strong> each. Quantities are
                pooled across colours and sizes.
              </span>
            </div>
          )}

          {colours.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <span className="label">
                Colour: <strong style={{ textTransform: 'none' }}>{activeColour}</strong>
              </span>
              <div className="chip-row">
                {colours.map((c) => {
                  const inStock = product.variants.some((v) => v.colour === c && v.stock > 0);
                  return (
                    <button
                      key={c}
                      className={`chip${activeColour === c ? ' chip-on' : ''}`}
                      onClick={() => {
                        setColour(c);
                        setSizeName(null);
                        setQty(1);
                      }}
                      aria-pressed={activeColour === c}
                    >
                      <span
                        className="swatch"
                        style={{ background: swatchColor(c), marginRight: 7 }}
                        aria-hidden
                      />
                      {c}
                      {!inStock && ' — sold out'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <span className="label">Size</span>
            <div className="chip-row">
              {sizesForColour.map((v) => (
                <button
                  key={v.id}
                  className={`chip${sizeName === v.size ? ' chip-on' : ''}`}
                  disabled={v.stock === 0}
                  onClick={() => {
                    setSizeName(v.size);
                    setQty(1);
                  }}
                  aria-pressed={sizeName === v.size}
                  title={v.stock === 0 ? 'Out of stock' : `${v.stock} in stock`}
                >
                  {v.size}
                </button>
              ))}
            </div>
            {variant && variant.stock <= 5 && (
              <p className="hint" style={{ color: 'var(--warn)' }}>
                Only {variant.stock} left in this size.
              </p>
            )}
          </div>

          <div className="row row-wrap" style={{ marginBottom: 20 }}>
            <div>
              <span className="label">Quantity</span>
              <div className="qty">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))}
                  disabled={!variant || qty >= maxQty}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {variant && (
              <div style={{ alignSelf: 'flex-end' }}>
                <span className="small muted">Line total </span>
                <strong>{formatPrice(previewUnit * qty)}</strong>
              </div>
            )}
          </div>

          <div className="stack" style={{ '--gap': '10px' } as CSSProperties}>
            <button className="btn btn-lg btn-block" onClick={onAdd} disabled={!variant}>
              {variant ? 'Add to bag' : 'Select a size'}
            </button>
            <button
              className="btn btn-lg btn-block btn-outline"
              onClick={onBuyNow}
              disabled={!variant}
            >
              Buy it now <ArrowIcon />
            </button>
          </div>

          <ul
            className="stack small muted"
            style={{ '--gap': '7px', listStyle: 'none', padding: 0, marginTop: 22 } as CSSProperties}
          >
            <li className="row" style={{ '--row-gap': '8px' } as CSSProperties}>
              <CheckIcon /> Free island-wide delivery
            </li>
            <li className="row" style={{ '--row-gap': '8px' } as CSSProperties}>
              <CheckIcon /> 14-day exchanges on unworn pieces
            </li>
            <li className="row" style={{ '--row-gap': '8px' } as CSSProperties}>
              <CheckIcon /> Pay by card or confirm on WhatsApp
            </li>
          </ul>

          <div style={{ marginTop: 30 }}>
            <details className="accordion" open>
              <summary>Description</summary>
              <div>{product.description}</div>
            </details>
            <details className="accordion">
              <summary>Sizing &amp; availability</summary>
              <div>
                <dl className="kv">
                  {product.variants.map((v) => (
                    <div key={v.id} style={{ display: 'contents' }}>
                      <dt>
                        {v.colour} / {v.size}
                      </dt>
                      <dd>{v.stock > 0 ? `${v.stock} in stock` : 'Sold out'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
            <details className="accordion">
              <summary>Delivery &amp; returns</summary>
              <div>
                Dispatched within 1–2 working days from Colombo. Island-wide delivery
                takes 2–4 working days and is free on every order. Unworn
                pieces can be exchanged within 14 days.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
