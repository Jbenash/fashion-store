import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/auth';

const LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/orders', label: 'Orders', end: false },
  { to: '/admin/products', label: 'Products', end: false },
  { to: '/admin/categories', label: 'Categories', end: false },
];

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="wrap page">
      <div className="page-head">
        <span className="eyebrow">Admin panel</span>
        <h1>Store management</h1>
        <p className="muted">Signed in as {user?.name}</p>
      </div>

      <div className="admin">
        <nav className="admin-nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'admin-on' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
