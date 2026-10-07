/** Mirrors the NestJS entities / DTOs exposed under /api. */

export type Role = 'CUSTOMER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'PAYHERE' | 'WHATSAPP';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: number;
  name: string;
}

export interface ProductVariant {
  id: number;
  size: string;
  colour: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  bulkMinQty: number | null;
  bulkPrice: number | null;
  imageUrl: string | null;
  /** Cloudinary asset id behind imageUrl; null for externally hosted images. */
  imagePublicId: string | null;
  isActive: boolean;
  category: Category;
  variants: ProductVariant[];
  createdAt: string;
}

export interface OrderItem {
  id: number;
  variantId: number;
  productName: string;
  size: string;
  colour: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  user?: User;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  total: number;
  paymentRef: string | null;
  items: OrderItem[];
  createdAt: string;
}

/** POST /api/orders returns the order plus a handoff for the chosen payment method. */
export interface PayhereCheckout {
  action: string;
  fields: Record<string, string>;
}

export interface CreateOrderResult {
  order: Order;
  whatsappUrl?: string;
  payhere?: PayhereCheckout;
}

export interface AuthResult {
  token: string;
  user: User;
}

/** Body of POST /api/orders — must match CreateOrderDto exactly, because the
 *  backend ValidationPipe runs with forbidNonWhitelisted. */
export interface CreateOrderBody {
  items: { variantId: number; quantity: number }[];
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  paymentMethod: PaymentMethod;
}

export interface VariantInput {
  id?: number;
  size: string;
  colour: string;
  stock: number;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  bulkMinQty?: number;
  bulkPrice?: number;
  imageUrl?: string;
  imagePublicId?: string;
  categoryId: number;
  variants: VariantInput[];
}

/** What the signature endpoint hands back for one direct browser upload. */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

/** PATCH body. The nullable fields accept `null` to clear the stored value —
 *  `undefined` would be dropped by JSON.stringify and leave it unchanged. */
export interface ProductUpdate
  extends Partial<
    Omit<ProductInput, 'bulkMinQty' | 'bulkPrice' | 'imageUrl' | 'imagePublicId'>
  > {
  bulkMinQty?: number | null;
  bulkPrice?: number | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isActive?: boolean;
}

export interface ProductQuery {
  search?: string;
  categoryId?: number;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}
