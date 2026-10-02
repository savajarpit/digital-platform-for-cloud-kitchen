/**
 * Every cached request is addressed by one of these keys. Invalidating a
 * parent key (e.g. `qk.orders.all`) refreshes everything beneath it, so a
 * mutation only has to name the domain it touched.
 */
export const qk = {
  orders: {
    all: ["orders"] as const,
    list: (page: number) => ["orders", "list", page] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
    cancellation: (id: string) => ["orders", "cancellation", id] as const,
  },
  addresses: {
    all: ["addresses"] as const,
    list: ["addresses", "list"] as const,
    serviceability: (pincode: string, lat: number | null, lng: number | null) =>
      ["addresses", "serviceability", pincode, lat, lng] as const,
  },
  profile: {
    all: ["profile"] as const,
  },
  subscriptions: {
    all: ["subscriptions"] as const,
    list: ["subscriptions", "list"] as const,
    detail: (id: string) => ["subscriptions", "detail", id] as const,
    invoice: (id: string) => ["subscriptions", "invoice", id] as const,
  },
  plans: {
    detail: (id: string) => ["plans", "detail", id] as const,
    pageSettings: ["plans", "page-settings"] as const,
  },
  /** Tenant branding/config (printed on invoices). */
  config: {
    public: ["config", "public"] as const,
  },
  meals: {
    all: ["meals"] as const,
    list: (filters: unknown) => ["meals", "list", filters] as const,
    stock: (date: string) => ["meals", "stock", date] as const,
  },
  checkout: {
    slots: ["checkout", "slots"] as const,
    /** The subscription flow's own slot list (a slot can be orders-only). */
    subscriptionSlots: ["checkout", "slots", "subscriptions"] as const,
    config: ["checkout", "config"] as const,
    orderWindow: ["checkout", "order-window"] as const,
    pickup: ["checkout", "pickup"] as const,
    instant: ["checkout", "instant"] as const,
  },
  /** Admin screens: `admin("orders", page, status)` -> ["admin","orders",...] */
  admin: (...parts: unknown[]) => ["admin", ...parts] as const,
} as const;

export const ADMIN_ROOT = ["admin"] as const;

/** Freshness windows (ms) — how long cached data is served with no request. */
export const STALE = {
  short: 15_000,
  list: 30_000,
  long: 5 * 60_000,
} as const;
