'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wifi, Smartphone, Tv2, Package, Zap,
  ShoppingCart, Eye, LogIn, CheckCircle2,
  AlertCircle, X, ChevronDown, ChevronUp,
  ArrowUpRight, User, Info
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Identity {
  email: string;
  phone: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

interface IdentitySend {
  email: boolean;
  phone: boolean;
  user_id: boolean;
  first_name: boolean;
  last_name: boolean;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  event_type: string;
  customer_id?: number;
  message: string;
}

interface Product {
  id: string;
  name: string;
  tagline: string;
  price: number;
  priceLabel: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product catalogue  (fake Airtel services / devices)
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  {
    id: 'prepaid-499',
    name: 'Airtel Prepaid ₹499',
    tagline: 'Unlimited calls · 1.5 GB/day · 56 days validity',
    price: 499,
    priceLabel: '₹499',
    icon: Smartphone,
    badge: 'Best Seller',
    color: 'bg-rose-50 text-rose-600'
  },
  {
    id: 'fiber-999',
    name: 'Airtel Xstream Fiber',
    tagline: '200 Mbps broadband · Unlimited data · Free router',
    price: 999,
    priceLabel: '₹999/mo',
    icon: Wifi,
    badge: 'Popular',
    color: 'bg-blue-50 text-blue-600'
  },
  {
    id: 'airtel-black-1199',
    name: 'Airtel Black',
    tagline: 'Mobile + Broadband + OTT bundle in one plan',
    price: 1199,
    priceLabel: '₹1,199/mo',
    icon: Package,
    badge: 'New',
    color: 'bg-violet-50 text-violet-600'
  },
  {
    id: 'xstream-box',
    name: 'Airtel Xstream Box',
    tagline: 'Smart Android TV box · 1000+ channels · 4K HDR',
    price: 3999,
    priceLabel: '₹3,999',
    icon: Tv2,
    color: 'bg-amber-50 text-amber-600'
  },
  {
    id: '5g-upgrade',
    name: '5G SIM Upgrade',
    tagline: 'Upgrade your SIM to Airtel 5G — lightning fast speeds',
    price: 99,
    priceLabel: '₹99',
    icon: Zap,
    badge: '5G',
    color: 'bg-emerald-50 text-emerald-600'
  },
  {
    id: 'postpaid-799',
    name: 'Airtel Postpaid ₹799',
    tagline: 'Unlimited calls + 40 GB data + Netflix + Amazon Prime',
    price: 799,
    priceLabel: '₹799/mo',
    icon: Smartphone,
    color: 'bg-cyan-50 text-cyan-600'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Toast component
// ─────────────────────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border max-w-sm w-full
        ${isSuccess
          ? 'bg-white border-emerald-200'
          : 'bg-white border-red-200'
        } animate-in slide-in-from-right-5 duration-300`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${isSuccess ? 'text-emerald-500' : 'text-red-500'}`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
            ${toast.event_type === 'page_view' ? 'bg-blue-100 text-blue-700' :
              toast.event_type === 'login' ? 'bg-violet-100 text-violet-700' :
              'bg-emerald-100 text-emerald-700'}`}>
            {toast.event_type}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900">{toast.message}</p>
        {toast.customer_id && (
          <p className="text-xs text-gray-500 mt-1 font-mono">
            customer_id: <span className="text-[#E40000] font-bold">#{toast.customer_id}</span>
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Event log entry
// ─────────────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: number;
  ts: string;
  event_type: string;
  customer_id?: number;
  identifiers: string;
  product?: string;
  status: 'ok' | 'error';
  error?: string;
}

function EventLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No events fired yet. Interact with the store above.
      </div>
    );
  }

  const typeColor = (t: string) =>
    t === 'page_view' ? 'bg-blue-100 text-blue-700' :
    t === 'login'     ? 'bg-violet-100 text-violet-700' :
    'bg-emerald-100 text-emerald-700';

  return (
    <div className="divide-y divide-gray-100">
      {entries.map(e => (
        <div key={e.id} className="py-3 flex items-start gap-3 text-sm">
          <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide flex-shrink-0 ${typeColor(e.event_type)}`}>
            {e.event_type}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {e.status === 'ok' ? (
                <span className="font-mono text-[#E40000] font-semibold">→ customer #{e.customer_id}</span>
              ) : (
                <span className="text-red-600 font-medium">Error: {e.error}</span>
              )}
              {e.product && <span className="text-gray-500 truncate">{e.product}</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{e.identifiers} · {e.ts}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product card
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onView,
  onBuy,
  loading
}: {
  product: Product;
  onView: () => void;
  onBuy: () => void;
  loading: string | null;
}) {
  const Icon = product.icon;
  const isViewLoading = loading === `view-${product.id}`;
  const isBuyLoading  = loading === `buy-${product.id}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Card header */}
      <div className={`px-5 pt-5 pb-4`}>
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${product.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {product.badge && (
            <span className="px-2 py-0.5 rounded-full bg-[#E40000] text-white text-xs font-semibold">
              {product.badge}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 text-base leading-snug">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{product.tagline}</p>
      </div>

      {/* Price + actions */}
      <div className="mt-auto px-5 pb-5 pt-3 border-t border-gray-100">
        <div className="text-xl font-bold text-gray-900 mb-3">{product.priceLabel}</div>
        <div className="flex gap-2">
          <button
            onClick={onView}
            disabled={isViewLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200
                       text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors
                       disabled:opacity-50 flex-1 justify-center"
          >
            {isViewLoading ? (
              <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            View
          </button>
          <button
            onClick={onBuy}
            disabled={isBuyLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                       bg-[#E40000] text-white text-xs font-medium
                       hover:bg-[#C20000] transition-colors disabled:opacity-50
                       flex-1 justify-center"
          >
            {isBuyLoading ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5" />
            )}
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

let toastCounter = 0;
let logCounter = 0;

export default function DemoSitePage() {
  // ── Identity state ──────────────────────────────────────────────────────────
  const [identity, setIdentity] = useState<Identity>({
    email: '',
    phone: '',
    user_id: '',
    first_name: '',
    last_name: ''
  });

  const [send, setSend] = useState<IdentitySend>({
    email: true,
    phone: false,
    user_id: false,
    first_name: true,
    last_name: true
  });

  const [identityOpen, setIdentityOpen] = useState(true);
  const [logOpen, setLogOpen]           = useState(true);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [log,     setLog]     = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastCustomerId, setLastCustomerId] = useState<number | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  function addToast(t: Omit<Toast, 'id'>) {
    const id = ++toastCounter;
    setToasts(prev => [{ ...t, id }, ...prev].slice(0, 5));
  }

  function buildPayload(extras: Record<string, unknown>) {
    const payload: Record<string, unknown> = { ...extras };
    if (send.email    && identity.email)      payload.email      = identity.email;
    if (send.phone    && identity.phone)      payload.phone      = identity.phone;
    if (send.user_id  && identity.user_id)    payload.user_id    = identity.user_id;
    if (send.first_name && identity.first_name) payload.first_name = identity.first_name;
    if (send.last_name  && identity.last_name)  payload.last_name  = identity.last_name;
    return payload;
  }

  function identifierSummary() {
    const parts: string[] = [];
    if (send.email    && identity.email)      parts.push(`email:${identity.email}`);
    if (send.phone    && identity.phone)      parts.push(`phone:${identity.phone}`);
    if (send.user_id  && identity.user_id)    parts.push(`uid:${identity.user_id}`);
    return parts.length ? parts.join(', ') : 'no identifiers';
  }

  async function fireEvent(loadKey: string, payload: Record<string, unknown>, label: string, product?: string) {
    setLoading(loadKey);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const cid: number = data.customer_id;
      setLastCustomerId(cid);

      addToast({
        type: 'success',
        event_type: String(payload.event_type),
        customer_id: cid,
        message: label
      });

      setLog(prev => [
        {
          id: Date.now(),
          ts: new Date().toLocaleTimeString(),
          event_type: String(payload.event_type),
          customer_id: cid,
          identifiers: identifierSummary(),
          product,
          status: 'ok' as const,
        },
        ...prev,
      ].slice(0, 50));

    } catch (err: any) {
      const msg = err.message || 'Request failed';
      addToast({
        type: 'error',
        event_type: String(payload.event_type),
        message: msg
      });
      setLog(prev => [
        {
          id: Date.now(),
          ts: new Date().toLocaleTimeString(),
          event_type: String(payload.event_type),
          // customer_id: cid,
          identifiers: identifierSummary(),
          product,
          status: 'ok' as const,
        },
        ...prev,
      ].slice(0, 50));
    } finally {
      setLoading(null);
    }
  }

  // ── Event handlers ──────────────────────────────────────────────────────────

  function handleView(product: Product) {
    const payload = buildPayload({
      event_type: 'page_view',
      properties: { page: `/products/${product.id}`, product_name: product.name }
    });
    fireEvent(`view-${product.id}`, payload, `Viewed "${product.name}"`, product.name);
  }

  function handleBuy(product: Product) {
    const payload = buildPayload({
      event_type: 'purchase',
      properties: { amount: product.price, product_name: product.name }
    });
    fireEvent(`buy-${product.id}`, payload, `Purchased "${product.name}" for ${product.priceLabel}`, product.name);
  }

  async function handleLogin() {
    // If user_id already set, use it; otherwise fetch a clean sequential ID from the backend
    let uid = identity.user_id;
    if (!uid) {
      try {
        const res = await fetch('/api/suggest-uid');
        const data = await res.json();
        uid = data.user_id; // e.g. "u_21", "u_22", ...
      } catch {
        uid = `u_${Date.now().toString().slice(-4)}`;
      }
      setIdentity(prev => ({ ...prev, user_id: uid as string }));
      setSend(prev => ({ ...prev, user_id: true }));
    }

    const payload = buildPayload({ event_type: 'login', user_id: uid });
    fireEvent('login', payload, `Logged in as ${identity.first_name || identity.email || uid}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const hasIdentifier = (send.email && identity.email) ||
                        (send.phone && identity.phone) ||
                        (send.user_id && identity.user_id);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="bg-[#E40000] sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Airtel Store</span>
            <span className="hidden sm:block px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
              Demo Site
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lastCustomerId && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/90 bg-white/15 px-3 py-1.5 rounded-full">
                <User className="w-3 h-3" />
                CDP customer #{lastCustomerId}
              </span>
            )}
            <button
              onClick={handleLogin}
              disabled={loading === 'login'}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-[#E40000]
                         text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {loading === 'login' ? (
                <span className="w-3.5 h-3.5 border-2 border-[#E40000] border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              {identity.first_name ? `Login as ${identity.first_name}` : 'Login'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── CDP banner ──────────────────────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">CDP Event Simulator.</span>{' '}
            This is a demo consumer-facing site. Every button click fires a real event to{' '}
            <code className="bg-amber-100 px-1 rounded font-mono">POST /api/events</code> and the
            CDP resolves identity, unifies the profile, and returns a{' '}
            <code className="bg-amber-100 px-1 rounded font-mono">customer_id</code>.{' '}
            Open the <a href="/dashboard" target="_blank" className="text-[#E40000] underline font-medium">CDP Dashboard <ArrowUpRight className="inline w-3 h-3" /></a> to see events arrive in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* ── Left: Identity panel ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setIdentityOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E40000]" />
                  <span className="font-semibold text-gray-900 text-sm">Visitor Identity</span>
                  {!hasIdentifier && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                      required
                    </span>
                  )}
                </div>
                {identityOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>

              {identityOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 pt-3">
                    Enter visitor identifiers. Check a field to include it in the event payload.
                    Simulates what a real website SDK would send.
                  </p>

                  {/* Fields */}
                  {([
                    { key: 'email',      label: 'Email',      placeholder: 'visitor@example.com', type: 'email' },
                    { key: 'phone',      label: 'Phone',      placeholder: '+91 98765 43210',     type: 'tel'   },
                    { key: 'user_id',    label: 'User ID',    placeholder: 'auto-filled on login', type: 'text'  },
                    { key: 'first_name', label: 'First Name', placeholder: 'Rahul',                type: 'text'  },
                    { key: 'last_name',  label: 'Last Name',  placeholder: 'Sharma',               type: 'text'  }
                  ] as { key: keyof Identity; label: string; placeholder: string; type: string }[]).map(f => (
                    <div key={f.key}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="checkbox"
                          id={`chk-${f.key}`}
                          checked={send[f.key]}
                          onChange={e => setSend(prev => ({ ...prev, [f.key]: e.target.checked }))}
                          className="w-3.5 h-3.5 accent-[#E40000] cursor-pointer"
                        />
                        <label htmlFor={`chk-${f.key}`} className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                          {f.label}
                        </label>
                      </div>
                      <input
                        type={f.type}
                        value={identity[f.key]}
                        onChange={e => setIdentity(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className={`w-full px-3 py-2 rounded-lg border text-sm placeholder:text-gray-400
                          focus:outline-none focus:border-[#E40000] focus:ring-2 focus:ring-red-100 transition-colors
                          ${send[f.key]
                            ? 'border-gray-300 bg-white text-gray-900'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                          }
                          ${f.key === 'user_id' ? 'font-mono text-xs' : ''}`}
                        readOnly={f.key === 'user_id'}
                      />
                    </div>
                  ))}

                  {/* Quick-fill presets */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Quick fill</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'New visitor',    email: 'demo.visitor@test.com', phone: '', first_name: 'Demo',   last_name: 'Visitor'  },
                        { label: 'Priya (existing)', email: 'priya.sharma@gmail.com', phone: '', first_name: 'Priya', last_name: 'Sharma'  },
                        { label: 'Rahul (existing)', email: 'rahul.verma@yahoo.com',  phone: '', first_name: 'Rahul', last_name: 'Verma'   }
                      ].map(p => (
                        <button
                          key={p.label}
                          onClick={() => {
                            setIdentity(prev => ({
                              ...prev,
                              email: p.email,
                              phone: p.phone,
                              first_name: p.first_name,
                              last_name: p.last_name,
                              user_id: ''
                            }));
                            setSend(prev => ({ ...prev, email: true, phone: false, user_id: false, first_name: true, last_name: true }));
                          }}
                          className="px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600
                                     hover:border-[#E40000] hover:text-[#E40000] transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payload preview */}
                  <div className="bg-gray-900 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1.5 font-mono uppercase">Next event payload preview</p>
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
{JSON.stringify(
  buildPayload({ event_type: 'page_view | login | purchase', properties: '{ … }' }),
  null, 2
)}
                    </pre>
                  </div>

                  {!hasIdentifier && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠ Enable at least one identifier (email, phone, or user_id) and fill it in before firing events.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Event log ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setLogOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#E40000]" />
                  <span className="font-semibold text-gray-900 text-sm">Event Log</span>
                  {log.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#E40000] text-white text-xs font-bold">
                      {log.length}
                    </span>
                  )}
                </div>
                {logOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>
              {logOpen && (
                <div className="px-5 pb-4 border-t border-gray-100 max-h-72 overflow-y-auto">
                  <EventLog entries={log} />
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Store ──────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Hero strip */}
            <div className="bg-gradient-to-r from-[#E40000] to-[#9F0000] rounded-2xl p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
                Airtel Store — Limited Time Offers
              </p>
              <h2 className="text-2xl font-bold leading-tight mb-2">
                Connect faster.<br />Live smarter.
              </h2>
              <p className="text-sm text-white/80">
                Browse plans, view product details, and purchase — each action fires a real CDP event.
              </p>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {PRODUCTS.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  loading={loading}
                  onView={() => handleView(p)}
                  onBuy={() => handleBuy(p)}
                />
              ))}
            </div>

            {/* How-to guide */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#E40000]" />
                How to demonstrate the CDP unification flow
              </h3>
              <ol className="space-y-2.5 text-sm text-gray-600">
                {[
                  { n: '1', text: 'Fill in an email (e.g. a new visitor email) and enable it. Click "View" on any product — a page_view event fires. Note the customer_id returned.' },
                  { n: '2', text: 'Now click "Login" — a login event fires. A user_id is auto-generated and backfilled onto the same customer profile. Same customer_id.' },
                  { n: '3', text: 'Click "Buy" on a product — a purchase event fires. The CDP records the transaction under the same unified profile.' },
                  { n: '4', text: 'Open the CDP Dashboard → Profiles page. Search for the email. See all three events unified in one 360° customer profile.' },
                  { n: '5', text: 'Try "Quick fill → Priya (existing)" to fire events for an existing seeded customer and watch identity resolution merge them instantly.' }
                ].map(s => (
                  <li key={s.n} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#E40000] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {s.n}
                    </span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Airtel Store — Demo Site (CDP Event Simulator)</span>
          <a
            href="/dashboard"
            target="_blank"
            className="flex items-center gap-1 text-[#E40000] font-medium hover:underline"
          >
            Open CDP Dashboard <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </footer>

      {/* ── Toast stack ───────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </div>
  );
}
