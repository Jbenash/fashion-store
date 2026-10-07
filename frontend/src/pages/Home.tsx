import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import ProductCard from '../components/ProductCard';
import { ErrorBox, ProductGridSkeleton } from '../components/States';
import { ArrowIcon, ChatIcon, LeafIcon, TagIcon, TruckIcon } from '../components/Icons';

const VALUES = [
  { icon: <TruckIcon />, title: 'Island-wide delivery', body: 'Free on every order, 2–4 working days.' },
  { icon: <TagIcon />, title: 'Bulk pricing', body: 'Automatic tier pricing once you reach the minimum.' },
  { icon: <LeafIcon />, title: 'Small-run production', body: 'Natural fibres, made in limited quantities.' },
  { icon: <ChatIcon />, title: 'Order on WhatsApp', body: 'Prefer to chat? Check out and confirm by message.' },
];

export default function Home() {
  const featured = useAsync(() => api.products({ sort: 'newest' }), []);
  const categories = useAsync(() => api.categories(), []);

  const products = (featured.data ?? []).slice(0, 8);

  return (
    <>
      <section className="wrap hero">
        <div className="hero-copy">
          <span className="eyebrow">Season 01 — Essentials</span>
          <h1>Quiet clothing, built to be worn out.</h1>
          <p className="lede">
            Heavyweight cotton, washed linen and canvas, cut in small runs.
            Order one piece or a hundred — bulk pricing applies automatically.
          </p>
          <div className="row row-wrap" style={{ marginTop: 26 }}>
            <Link to="/products" className="btn btn-lg">
              Shop the collection <ArrowIcon />
            </Link>
            <Link to="/bulk" className="btn btn-lg btn-outline">
              Bulk enquiries
            </Link>
          </div>
        </div>

        <div className="hero-art">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1100&q=70"
            alt="Two models wearing pieces from the current collection"
          />
          <div className="hero-tag">
            <div className="eyebrow">Now shipping</div>
            <strong>The Oversized Tee</strong>
          </div>
        </div>
      </section>

      <section className="wrap section-tight">
        <div className="value-grid">
          {VALUES.map((v) => (
            <div key={v.title} className="value-item">
              <span style={{ color: 'var(--accent)', display: 'block', marginBottom: 10 }}>
                {v.icon}
              </span>
              <h4>{v.title}</h4>
              <p>{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {categories.data && categories.data.length > 0 && (
        <section className="wrap section-tight">
          <div className="section-head">
            <div>
              <span className="eyebrow">Browse</span>
              <h2>Shop by category</h2>
            </div>
          </div>
          <div className="cat-grid">
            {categories.data.map((c, i) => (
              <Link key={c.id} to={`/products?categoryId=${c.id}`} className="cat-tile">
                <img
                  src={`https://picsum.photos/seed/cat-${c.id}-${i}/700/420`}
                  alt=""
                  loading="lazy"
                />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="wrap section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Latest</span>
            <h2>New arrivals</h2>
          </div>
          <Link to="/products" className="link-underline small">
            View all products
          </Link>
        </div>

        {featured.loading && <ProductGridSkeleton count={4} />}

        {featured.error && <ErrorBox message={featured.error} onRetry={featured.reload} />}

        {!featured.loading && !featured.error && (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
