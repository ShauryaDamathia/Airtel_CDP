// Simple API client. Reads JWT from localStorage; redirects to /login on 401.

const TOKEN_KEY = 'cdp_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getUser(): any {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('cdp_user');
  return u ? JSON.parse(u) : null;
}

export function setUser(u: any) {
  if (typeof window === 'undefined') return;
  if (u) localStorage.setItem('cdp_user', JSON.stringify(u));
  else localStorage.removeItem('cdp_user');
}

async function request(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    }
  });

  if (res.status === 401) {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(`${err.error || 'Request failed'} (${res.status} ${path})`);
  }
  return res.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // ── Customers ─────────────────────────────────────────────────────────────
  listCustomers: (q?: string) =>
    request('/customers' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  getCustomer: (id: number) => request(`/customers/${id}`),

  // ── Segments ──────────────────────────────────────────────────────────────
  listSegments: () => request('/segments'),
  getSegment:   (id: number) => request(`/segments/${id}`),
  recomputeSegment: (id: number) =>
    request(`/segments/${id}/recompute`, { method: 'POST' }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  overview:      () => request('/analytics/overview'),
  dau:           () => request('/analytics/dau'),
  eventsTrend:   () => request('/analytics/events-trend'),
  revenueTrend:  () => request('/analytics/revenue-trend'),
  funnel:        () => request('/analytics/funnel'),

  // ── Consents — current records ────────────────────────────────────────────
  listConsents: () => request('/consents'),
  updateConsent: (
    customer_id: number,
    purpose: string,
    granted: boolean,
    meta?: { source?: string; channel?: string; notes?: string; policy_version?: string }
  ) =>
    request('/consents', {
      method: 'POST',
      body: JSON.stringify({ customer_id, purpose, granted, ...meta })
    }),

  // ── Consents — history ────────────────────────────────────────────────────
  /** Full audit log (admin/compliance only) */
  listConsentHistory: (params?: { purpose?: string; since?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.purpose) q.set('purpose', params.purpose);
    if (params?.since)   q.set('since',   params.since);
    if (params?.limit)   q.set('limit',   String(params.limit));
    if (params?.offset)  q.set('offset',  String(params.offset));
    const qs = q.toString();
    return request(`/consents/history${qs ? '?' + qs : ''}`);
  },

  /** History for a single customer */
  getCustomerConsentHistory: (customerId: number) =>
    request(`/consents/customer/${customerId}/history`),

  /** Aggregated consent analytics */
  consentAnalytics: () => request('/consents/analytics'),

  // ── Fuzzy match review ────────────────────────────────────────────────────
  listPendingMatches: () => request('/matches/pending'),
  confirmMatch: (id: number) =>
    request(`/matches/${id}/confirm`, { method: 'POST' }),
  rejectMatch: (id: number) =>
    request(`/matches/${id}/reject`, { method: 'POST' })
};
