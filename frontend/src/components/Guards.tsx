import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { Loading } from './States';

/** Requires a signed-in user; remembers where they were headed. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loading label="Checking your session" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** Admin-only. Customers get sent home rather than to a dead end. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <Loading label="Checking your session" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
