import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the primary action as destructive. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Confirm | null>(null);

type Pending = ConfirmOptions;

/**
 * Replaces window.confirm with an in-app dialog. Keeping the promise-based
 * shape means call sites read the same as the native API they replaced.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  // The resolver lives in a ref, not in state. Resolving inside a state updater
  // would be a side effect in a function React treats as pure and may invoke
  // twice under StrictMode.
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        // A second call while one is open abandons the first rather than
        // leaving its promise pending forever.
        resolver.current?.(false);
        resolver.current = resolve;
        setPending(options);
      }),
    [],
  );

  const settle = useCallback((ok: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPending(null);
    resolve?.(ok);
  }, []);

  // Escape always cancels, matching the native dialog.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') settle(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, settle]);

  // Stop the page behind the dialog from scrolling.
  useEffect(() => {
    if (!pending) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [pending]);

  useEffect(() => {
    if (pending) confirmButton.current?.focus();
  }, [pending]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {pending && (
        <div
          className="modal-backdrop"
          onClick={() => settle(false)}
          role="presentation"
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.message ? 'confirm-message' : undefined}
            // Clicks inside must not reach the dismissing backdrop.
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title">{pending.title}</h3>
            {pending.message && (
              <p id="confirm-message" className="modal-message">
                {pending.message}
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => settle(false)}>
                {pending.cancelLabel ?? 'Go back'}
              </button>
              <button
                ref={confirmButton}
                className={`btn${pending.danger ? ' btn-danger-solid' : ''}`}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
