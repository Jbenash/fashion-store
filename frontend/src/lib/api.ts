import type {
  AuthResult,
  Category,
  CreateOrderBody,
  CreateOrderResult,
  Order,
  OrderStatus,
  Product,
  ProductInput,
  ProductQuery,
  ProductUpdate,
  UploadSignature,
} from './types';

const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const TOKEN_KEY = 'atelier.token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode — session-only auth is an acceptable fallback */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Nest replies with { message: string | string[] }; class-validator uses the array form. */
function readError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join('. ');
    if (typeof m === 'string') return m;
  }
  return `Request failed (${status})`;
}

let onUnauthorized: (() => void) | null = null;

/** Lets the auth store clear a session when the server rejects a stale token. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.body) headers.set('Content-Type', 'application/json');

  const token = tokenStore.get();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  if (res.status === 401 && auth) {
    onUnauthorized?.();
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) throw new ApiError(res.status, readError(body, res.status));
  return body as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // ---- auth ----
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ---- catalog ----
  categories: () => request<Category[]>('/categories'),

  createCategory: (name: string) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
      auth: true,
    }),

  products: (q: ProductQuery = {}) =>
    request<Product[]>(`/products${query({ ...q })}`),

  product: (id: number) => request<Product>(`/products/${id}`),

  // ---- catalog admin ----
  adminProducts: () => request<Product[]>('/products/admin/all', { auth: true }),

  adminProduct: (id: number) =>
    request<Product>(`/products/admin/${id}`, { auth: true }),

  createProduct: (body: ProductInput) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  updateProduct: (id: number, body: ProductUpdate) =>
    request<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    }),

  deactivateProduct: (id: number) =>
    request<Product>(`/products/${id}`, { method: 'DELETE', auth: true }),

  // ---- uploads ----
  uploadSignature: () =>
    request<UploadSignature>('/uploads/signature', { method: 'POST', auth: true }),

  // ---- orders ----
  createOrder: (body: CreateOrderBody) =>
    request<CreateOrderResult>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  myOrders: () => request<Order[]>('/orders/my', { auth: true }),

  order: (id: number) => request<Order>(`/orders/${id}`, { auth: true }),

  /** Customer-initiated cancellation; the server allows it only while PENDING. */
  cancelOrder: (id: number) =>
    request<Order>(`/orders/${id}/cancel`, { method: 'PATCH', auth: true }),

  /** wa.me link for a WhatsApp order, rebuilt server-side on demand. */
  orderWhatsapp: (id: number) =>
    request<{ url: string }>(`/orders/${id}/whatsapp`, { auth: true }),

  allOrders: (status?: OrderStatus) =>
    request<Order[]>(`/orders${query({ status })}`, { auth: true }),

  updateOrderStatus: (id: number, status: OrderStatus) =>
    request<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      auth: true,
    }),
};
