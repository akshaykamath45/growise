import type {
  ActivityEvent,
  AgentOpsEvent,
  AgentOpsOverview,
  AgentRunDetail,
  AgentRunSummary,
  CatalogHealth,
  CatalogRetryResult,
  Enrollment,
  Product,
  ProductInput,
  Recommendation,
  User,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---- Auth ----
export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  email: string;
}

export const authApi = {
  signup: (email: string, password: string, tracking_opt_in: boolean) =>
    request<TokenResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, tracking_opt_in }),
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) => request<User>("/api/auth/me", {}, token),
};

// ---- Products ----
export interface ProductQuery {
  category?: string | string[];
  level?: string | string[];
  q?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const productsApi = {
  list: (query: ProductQuery = {}) =>
    request<Product[]>(`/api/products${toQueryString(query as Record<string, unknown>)}`),
  categories: () => request<string[]>("/api/products/categories"),
  get: (id: number) => request<Product>(`/api/products/${id}`),
  create: (data: ProductInput, token: string) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(data) }, token),
  update: (id: number, data: Partial<ProductInput>, token: string) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  remove: (id: number, token: string) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }, token),
};

// ---- Events ----
export interface EventInput {
  event_type: string;
  product_id?: number | null;
  search_query?: string | null;
  metadata?: Record<string, unknown> | null;
  client_ts?: string;
}

export const eventsApi = {
  sendBatch: (events: EventInput[], token: string) =>
    request<{ accepted: number }>(
      "/api/events/batch",
      { method: "POST", body: JSON.stringify({ events }) },
      token
    ),
  mine: (token: string) => request<ActivityEvent[]>("/api/events/me", {}, token),
};

// ---- Enrollments ----
export const enrollmentsApi = {
  mine: (token: string) => request<Enrollment[]>("/api/enrollments/me", {}, token),
  enroll: (productId: number, token: string) =>
    request<Enrollment>(
      "/api/enrollments",
      { method: "POST", body: JSON.stringify({ product_id: productId }) },
      token
    ),
};

// ---- Recommendations ----
export const recommendationsApi = {
  getForYou: (token: string) => request<Recommendation | null>("/api/recommendations/me", {}, token),
  refresh: (token: string) =>
    request<Recommendation>("/api/recommendations/refresh", { method: "POST" }, token),
};

export const agentOpsApi = {
  overview: (token: string) => request<AgentOpsOverview>("/api/admin/agent-ops/overview", {}, token),
  events: (
    token: string,
    filters: { limit?: number; event_type?: string; user_id?: number; product_id?: number; query?: string } = {}
  ) => request<AgentOpsEvent[]>(`/api/admin/agent-ops/events${toQueryString({ limit: 50, ...filters })}`, {}, token),
  runs: (token: string, limit = 20) => request<AgentRunSummary[]>(`/api/admin/agent-ops/runs?limit=${limit}`, {}, token),
  run: (token: string, runId: number) => request<AgentRunDetail>(`/api/admin/agent-ops/runs/${runId}`, {}, token),
  catalogHealth: (token: string) => request<CatalogHealth>("/api/admin/agent-ops/catalog-health", {}, token),
  retryCatalogSync: (token: string) =>
    request<CatalogRetryResult>("/api/admin/agent-ops/catalog-health/retry", { method: "POST" }, token),
};
