import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { unitPriceFor } from '../lib/format';
import type { Product, ProductVariant } from '../lib/types';

const CART_KEY = 'atelier.cart';

/** A cart line snapshots what it needs to render offline. Prices are a
 *  preview — the server recomputes every figure when the order is placed. */
export interface CartLine {
  variantId: number;
  productId: number;
  name: string;
  imageUrl: string | null;
  size: string;
  colour: string;
  price: number;
  bulkMinQty: number | null;
  bulkPrice: number | null;
  stock: number;
  quantity: number;
}

export interface PricedLine extends CartLine {
  unitPrice: number;
  lineTotal: number;
  /** True when this line is billed at the product's bulk tier. */
  bulk: boolean;
}

interface CartApi {
  lines: CartLine[];
  priced: PricedLine[];
  count: number;
  subtotal: number;
  savings: number;
  add: (product: Product, variant: ProductVariant, quantity: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartApi | null>(null);

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* quota or private mode — the cart simply won't survive a reload */
    }
  }, [lines]);

  const add = useCallback(
    (product: Product, variant: ProductVariant, quantity: number) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === variant.id);
        if (existing) {
          return prev.map((l) =>
            l.variantId === variant.id
              ? {
                  ...l,
                  stock: variant.stock,
                  quantity: Math.min(l.quantity + quantity, variant.stock),
                }
              : l,
          );
        }
        return [
          ...prev,
          {
            variantId: variant.id,
            productId: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            size: variant.size,
            colour: variant.colour,
            price: product.price,
            bulkMinQty: product.bulkMinQty,
            bulkPrice: product.bulkPrice,
            stock: variant.stock,
            quantity: Math.min(quantity, variant.stock),
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: Math.min(quantity, l.stock) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((variantId: number) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // Bulk tiers are per PRODUCT, so quantities are pooled across its variants
  // before the tier is chosen — matching OrdersService.
  const priced = useMemo<PricedLine[]>(() => {
    const qtyByProduct = new Map<number, number>();
    for (const l of lines) {
      qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
    }
    return lines.map((l) => {
      const unitPrice = unitPriceFor(l, qtyByProduct.get(l.productId) ?? 0);
      return {
        ...l,
        unitPrice,
        lineTotal: unitPrice * l.quantity,
        bulk: unitPrice < l.price,
      };
    });
  }, [lines]);

  const subtotal = useMemo(
    () => priced.reduce((sum, l) => sum + l.lineTotal, 0),
    [priced],
  );

  const savings = useMemo(
    () => priced.reduce((sum, l) => sum + (l.price - l.unitPrice) * l.quantity, 0),
    [priced],
  );

  const count = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({ lines, priced, count, subtotal, savings, add, setQuantity, remove, clear }),
    [lines, priced, count, subtotal, savings, add, setQuantity, remove, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
