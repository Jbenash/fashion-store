import { Link } from 'react-router-dom';
import { formatPrice, hasBulkTier, imageOf, swatchColor, totalStock } from '../lib/format';
import type { Product } from '../lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const stock = totalStock(product);
  const colours = [...new Set(product.variants?.map((v) => v.colour) ?? [])];
  const isNew =
    Date.now() - new Date(product.createdAt).getTime() < 1000 * 60 * 60 * 24 * 14;

  return (
    <Link to={`/products/${product.id}`} className="pcard">
      <div className="pcard-media">
        <img src={imageOf(product)} alt={product.name} loading="lazy" />

        <div className="pcard-flags">
          {isNew && stock > 0 && <span className="badge badge-solid">New</span>}
          {hasBulkTier(product) && <span className="badge badge-accent">Bulk tier</span>}
        </div>

        {stock === 0 && (
          <div className="oos-veil">
            <span className="badge">Sold out</span>
          </div>
        )}
      </div>

      <h3 className="pcard-name">{product.name}</h3>
      <span className="tiny muted">{product.category?.name}</span>

      <div className="row row-between" style={{ marginTop: 6 }}>
        <span className="pcard-price">{formatPrice(product.price)}</span>
        {stock > 0 && stock <= 5 && (
          <span className="tiny" style={{ color: 'var(--warn)' }}>
            Only {stock} left
          </span>
        )}
      </div>

      {colours.length > 0 && (
        <div className="swatches" aria-label={`${colours.length} colours`}>
          {colours.slice(0, 5).map((c) => (
            <span
              key={c}
              className="swatch"
              style={{ background: swatchColor(c) }}
              title={c}
            />
          ))}
          {colours.length > 5 && <span className="tiny faint">+{colours.length - 5}</span>}
        </div>
      )}
    </Link>
  );
}
