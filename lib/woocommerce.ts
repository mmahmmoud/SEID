/**
 * WooCommerce REST API v3 client
 * Credentials are read from environment variables — never hardcoded.
 *
 * Required .env variables:
 *   WOOCOMMERCE_URL=https://sejf.ae
 *   WOOCOMMERCE_KEY=ck_...
 *   WOOCOMMERCE_SECRET=cs_...
 */

const WC_URL = process.env.WOOCOMMERCE_URL?.replace(/\/$/, "") ?? "";
const WC_KEY = process.env.WOOCOMMERCE_KEY ?? "";
const WC_SECRET = process.env.WOOCOMMERCE_SECRET ?? "";

function authHeader(): string {
  return "Basic " + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64");
}

async function wcFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${WC_URL}/wp-json/wc/v3${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WooCommerce API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface WCOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_paid: string | null;
  total: string;
  subtotal: string;
  total_tax: string;
  payment_method: string;
  payment_method_title: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    country: string;
  };
  line_items: WCLineItem[];
}

export interface WCLineItem {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  price: string;
  total: string;
  total_tax: string;
  product_id: number;
}

/** Fetch orders with optional filters */
export async function getOrders(params: {
  status?: string;
  after?: string;
  per_page?: number;
  page?: number;
} = {}): Promise<WCOrder[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.after) qs.set("after", params.after);
  qs.set("per_page", String(params.per_page ?? 50));
  qs.set("page", String(params.page ?? 1));
  return wcFetch<WCOrder[]>(`/orders?${qs.toString()}`);
}

/** Fetch a single order */
export async function getOrder(orderId: number): Promise<WCOrder> {
  return wcFetch<WCOrder>(`/orders/${orderId}`);
}

/** Update order status */
export async function updateOrderStatus(orderId: number, status: string): Promise<WCOrder> {
  return wcFetch<WCOrder>(`/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface WCProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  status: string;
}

/** Fetch all products (handles pagination) */
export async function getAllProducts(): Promise<WCProduct[]> {
  const all: WCProduct[] = [];
  let page = 1;
  while (true) {
    const batch = await wcFetch<WCProduct[]>(`/products?per_page=100&page=${page}`);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

/** Update product stock quantity in WooCommerce */
export async function updateProductStock(
  wcProductId: number,
  stockQuantity: number
): Promise<WCProduct> {
  return wcFetch<WCProduct>(`/products/${wcProductId}`, {
    method: "PUT",
    body: JSON.stringify({ stock_quantity: stockQuantity, manage_stock: true }),
  });
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface WCWebhook {
  id: number;
  name: string;
  status: string;
  topic: string;
  delivery_url: string;
}

/** List existing webhooks */
export async function listWebhooks(): Promise<WCWebhook[]> {
  return wcFetch<WCWebhook[]>("/webhooks?per_page=100");
}

/** Register a webhook */
export async function createWebhook(params: {
  name: string;
  topic: string;
  delivery_url: string;
  secret: string;
}): Promise<WCWebhook> {
  return wcFetch<WCWebhook>("/webhooks", {
    method: "POST",
    body: JSON.stringify({ ...params, status: "active" }),
  });
}

/** Delete a webhook */
export async function deleteWebhook(webhookId: number): Promise<void> {
  await wcFetch(`/webhooks/${webhookId}?force=true`, { method: "DELETE" });
}
