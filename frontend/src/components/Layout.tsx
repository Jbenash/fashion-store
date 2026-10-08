import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';

const SHOP_LINKS = [
  { to: '/products', label: 'Shop all' },
  // ?new=1 is a real filter (recently added only). Pointing this at
  // ?sort=newest would render the same page as "Shop all", because newest is
  // already the default sort.
  { to: '/products?new=1', label: 'New in' },
  { to: '/bulk', label: 'Bulk orders' },
];

/** "Shop all" and "New in" share a path, so the `new` flag decides between them. */
function isShopLinkActive(to: string, location: { pathname: string; search: string }) {
  const [path, search = ''] = to.split('?');
  if (location.pathname !== path) return false;
  if (path !== '/products') return true;
  const wantsNew = new URLSearchParams(search).has('new');
  return new URLSearchParams(location.search).has('new') === wantsNew;
}

function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // A route change should always leave the drawer closed.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <div className="marquee">
        Free island-wide delivery · Automatic bulk pricing on larger orders
      </div>

      <header className="header">
        <div className="wrap header-inner">
          <Link to="/" className="brand">
            Atelier<span>.</span>
          </Link>

          <nav className="nav">
            {SHOP_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                // NavLink ignores the query string, so "Shop all" and "New in"
                // would both light up on /products. Compare it explicitly.
                className={`nav-link${isShopLinkActive(l.to, location) ? ' nav-on' : ''}`}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link${isActive ? ' nav-on' : ''}`}
              >
                Admin
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <Link to="/products" className="btn-icon" aria-label="Search products">
              <SearchIcon />
            </Link>

            <Link
              to={user ? '/account/orders' : '/login'}
              className="btn-icon"
              aria-label={user ? 'Your account' : 'Sign in'}
            >
              <UserIcon />
            </Link>

            <Link to="/cart" className="btn-icon cart-btn" aria-label={`Cart, ${count} items`}>
              <BagIcon />
              {count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
            </Link>

            <button
              className="btn-icon menu-btn"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <div className="drawer" role="dialog" aria-label="Menu">
            <div className="row row-between" style={{ marginBottom: 12 }}>
              <span className="brand">Atelier<span>.</span></span>
              <button className="btn-icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>

            {SHOP_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}

            <hr className="divider drawer-sep" />

            {user ? (
              <>
                <span className="small muted" style={{ padding: '0 12px 6px' }}>
                  Signed in as {user.name}
                </span>
                <Link to="/account/orders">My orders</Link>
                {isAdmin && <Link to="/admin">Admin panel</Link>}
                <button onClick={signOut}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create account</Link>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-col">
            <span className="brand">Atelier<span>.</span></span>
            <p style={{ marginTop: 12, maxWidth: '34ch' }}>
              Considered clothing and accessories, made in small runs and shipped
              across Sri Lanka.
            </p>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/products">All products</Link>
            <Link to="/products?sort=newest">New arrivals</Link>
            <Link to="/bulk">Bulk &amp; wholesale</Link>
          </div>

          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/account/orders">Order history</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
          </div>

          <div className="footer-col">
            <h4>Help</h4>
            <p>Mon–Fri, 9am–5pm</p>
            <p>hello@atelier.lk</p>
          </div>
        </div>

        <div className="footer-base">
          <span>© {new Date().getFullYear()} Atelier. A demo storefront.</span>
          <span>Payments by PayHere · Orders via WhatsApp</span>
        </div>
      </div>
    </footer>
  );
}

/** Any navigation should land at the top of the new page. */
function ScrollReset() {
  const { pathname } = useLocation();
  // Braces matter: a concise arrow would return scrollTo's value, and React
  // would treat that as the cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <>
      <ScrollReset />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
