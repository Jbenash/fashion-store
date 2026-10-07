import type { CSSProperties, ReactNode } from 'react';
import { BoxIcon } from './Icons';

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="skel skel-media" />
          <div className="skel skel-line" style={{ width: '75%' }} />
          <div className="skel skel-line" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel-body stack" style={{ '--gap': '14px' } as CSSProperties}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel" style={{ height: 46 }} />
      ))}
    </div>
  );
}

export function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <BoxIcon />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert alert-error row row-between row-wrap">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-sm btn-outline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="center-box">
      <div className="stack center" style={{ '--gap': '10px' } as CSSProperties}>
        <span className="spinner" />
        <span className="small muted">{label}…</span>
      </div>
    </div>
  );
}
