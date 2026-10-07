import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap page center-box">
      <div className="center stack">
        <span className="eyebrow">404</span>
        <h1>This page has sold out</h1>
        <p className="muted">The link may be old, or the piece was removed.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <Link to="/" className="btn">
            Back home
          </Link>
          <Link to="/products" className="btn btn-outline">
            Shop all
          </Link>
        </div>
      </div>
    </div>
  );
}
