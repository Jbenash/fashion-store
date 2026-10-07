import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { formatPrice, hasBulkTier } from '../lib/format';
import { ProductGridSkeleton } from '../components/States';
import ProductCard from '../components/ProductCard';

export default function Bulk() {
  const { data, loading } = useAsync(() => api.products({}), []);
  const bulkProducts = (data ?? []).filter(hasBulkTier);

  return (
    <div className="wrap page">
      <div className="page-head wrap-narrow" style={{ paddingInline: 0 }}>
        <span className="eyebrow">Wholesale</span>
        <h1>Bulk &amp; team orders</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Kitting out a team, a café or a wedding party? Many of our pieces carry a
          second price tier that applies automatically once your quantity reaches
          the minimum — no code, no negotiation.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 40 }}>
        <div className="value-grid">
          <div className="value-item">
            <h4>1 · Pick your pieces</h4>
            <p>Mix colours and sizes freely — they all count toward the same total.</p>
          </div>
          <div className="value-item">
            <h4>2 · Reach the minimum</h4>
            <p>Quantities are pooled per product, so 4 black and 6 white tees make 10.</p>
          </div>
          <div className="value-item">
            <h4>3 · Price drops in the bag</h4>
            <p>The tier price replaces the unit price automatically at checkout.</p>
          </div>
          <div className="value-item">
            <h4>4 · Pay or confirm</h4>
            <p>Card payment via PayHere, or confirm on WhatsApp for an invoice.</p>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">Eligible</span>
          <h2>Products with bulk pricing</h2>
        </div>
      </div>

      {loading && <ProductGridSkeleton count={4} />}

      {!loading && bulkProducts.length === 0 && (
        <p className="muted">
          No products currently carry a bulk tier.{' '}
          <Link to="/products" className="link-underline">
            Browse the full shop
          </Link>
          .
        </p>
      )}

      {!loading && bulkProducts.length > 0 && (
        <>
          <div className="table-scroll card" style={{ marginBottom: 34 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit price</th>
                  <th>Minimum qty</th>
                  <th>Bulk price</th>
                  <th>You save</th>
                </tr>
              </thead>
              <tbody>
                {bulkProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/products/${p.id}`} className="link-underline bold">
                        {p.name}
                      </Link>
                    </td>
                    <td className="mono">{formatPrice(p.price)}</td>
                    <td className="mono">{p.bulkMinQty}+</td>
                    <td className="mono bold">{formatPrice(p.bulkPrice!)}</td>
                    <td className="mono" style={{ color: 'var(--accent)' }}>
                      {Math.round(((p.price - p.bulkPrice!) / p.price) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="product-grid">
            {bulkProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
