import type { OrderStatus, Product } from './types';

const money = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 2,
});

export const formatPrice = (n: number) => money.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Mirrors OrdersService.unitPrice — the tier depends on the TOTAL quantity
 *  ordered for a product, summed across all of its variants. The server
 *  recalculates this, so the client figure is a preview only. */
export function unitPriceFor(
  p: Pick<Product, 'price' | 'bulkMinQty' | 'bulkPrice'>,
  productQty: number,
): number {
  return p.bulkMinQty && p.bulkPrice && productQty >= p.bulkMinQty
    ? p.bulkPrice
    : p.price;
}

export const hasBulkTier = (
  p: Pick<Product, 'bulkMinQty' | 'bulkPrice'>,
): boolean => Boolean(p.bulkMinQty && p.bulkPrice);

export const totalStock = (p: Pick<Product, 'variants'>) =>
  p.variants?.reduce((n, v) => n + v.stock, 0) ?? 0;

export const priceRange = (p: Product) => {
  if (!hasBulkTier(p)) return formatPrice(p.price);
  return `${formatPrice(p.bulkPrice!)} – ${formatPrice(p.price)}`;
};

/**
 * The sizes the shop stocks, in the order a customer expects to see them.
 * Shared by the catalog filter and the admin product form so a size picked in
 * one always sorts correctly in the other.
 */
export const SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'Free Size',
] as const;

/** Sorts known sizes by the list above; anything custom goes last, alphabetically. */
export function sizeRank(size: string): number {
  const i = (SIZE_OPTIONS as readonly string[]).indexOf(size);
  return i === -1 ? SIZE_OPTIONS.length : i;
}

/** Named colours → a swatch. Unknown names fall back to a neutral chip. */
const SWATCHES: Record<string, string> = {
  black: '#1c1917',
  white: '#fdfdfc',
  ivory: '#f6f1e7',
  cream: '#f2e9d8',
  beige: '#ddcdb4',
  sand: '#d9c7a7',
  natural: '#d8cbb3',
  tan: '#b08a55',
  brown: '#6b4b32',
  camel: '#b98b57',
  grey: '#8d8780',
  gray: '#8d8780',
  charcoal: '#403c38',
  navy: '#243253',
  blue: '#3a5f9e',
  denim: '#4a6c96',
  sage: '#9aa88c',
  olive: '#6f7351',
  green: '#3f6b4a',
  red: '#a8352e',
  maroon: '#6f2229',
  burgundy: '#5d1f2b',
  rust: '#a8552a',
  terracotta: '#b36544',
  pink: '#dfa3ab',
  blush: '#e6c3c0',
  lilac: '#b5a6cd',
  purple: '#6b4a82',
  yellow: '#d8b34f',
  mustard: '#c99a2e',
  orange: '#cf7633',
};

export function swatchColor(colour: string): string {
  const key = colour.trim().toLowerCase();
  if (SWATCHES[key]) return SWATCHES[key];
  const word = key.split(/[\s/-]+/).find((w) => SWATCHES[w]);
  return word ? SWATCHES[word] : '#cfc7bd';
}

/** Status presentation: badge tone + customer-facing wording. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING: 'badge-warn',
  PAID: 'badge-info',
  CONFIRMED: 'badge-info',
  SHIPPED: 'badge-accent',
  DELIVERED: 'badge-ok',
  CANCELLED: 'badge-danger',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const STATUS_BLURB: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment or confirmation from our team.',
  PAID: 'Payment received. We are preparing your parcel.',
  CONFIRMED: 'Order confirmed and queued for dispatch.',
  SHIPPED: 'On its way to you.',
  DELIVERED: 'Delivered. We hope you love it.',
  CANCELLED: 'This order was cancelled and stock was returned.',
};

/** Mirrors the TRANSITIONS table in OrdersService, so the admin UI only ever
 *  offers a move the server will accept. */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const PLACEHOLDER_IMG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="%23f3efe9"/><path d="M150 170a26 26 0 100-52 26 26 0 000 52zM96 262l34-44 26 30 22-26 30 40z" fill="%23d6cec4"/></svg>`,
  );

export const imageOf = (p: { imageUrl: string | null }) =>
  p.imageUrl || PLACEHOLDER_IMG;
