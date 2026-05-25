'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, History, BarChart2, X,
  CheckCircle2, XCircle, Clock, Search,
  Download, ChevronDown, Info
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { AuthGuard } from '@/components/auth-guard';
import { api, getUser } from '@/lib/api';
import { fmtDateTime, timeAgo } from '@/lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DISPLAY_PURPOSES = [
  { key: 'analytics',          label: 'Analytics',           color: 'blue'   },
  { key: 'marketing_email',    label: 'Mktg Email',          color: 'purple' },
  { key: 'marketing_sms',      label: 'Mktg SMS',            color: 'pink'   },
  { key: 'personalization',    label: 'Personaliz.',         color: 'indigo' },
  { key: 'third_party_sharing',label: 'Third Party',         color: 'orange' },
  { key: 'data_retention',     label: 'Data Retention',      color: 'teal'   }
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ granted }: { granted: boolean | undefined }) {
  if (granted === undefined) return <span className="text-gray-300 text-xs">—</span>;
  return granted
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    : <XCircle      className="w-4 h-4 text-gray-300"    />;
}

function purposeColors(key: string) {
  const map: Record<string, string> = {
    analytics:           'bg-blue-100 text-blue-700',
    marketing_email:     'bg-purple-100 text-purple-700',
    marketing_sms:       'bg-pink-100 text-pink-700',
    personalization:     'bg-indigo-100 text-indigo-700',
    third_party_sharing: 'bg-orange-100 text-orange-700',
    data_retention:      'bg-teal-100 text-teal-700',
    marketing:           'bg-purple-100 text-purple-700'
  };
  return map[key] || 'bg-gray-100 text-gray-700';
}

// ─────────────────────────────────────────────────────────────────────────────
// History Drawer (slide-over)
// ─────────────────────────────────────────────────────────────────────────────

function HistoryDrawer({
  customerId, customerName, onClose
}: {
  customerId: number; customerName: string; onClose: () => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomerConsentHistory(customerId)
      .then(r => setHistory(r.history || []))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Consent History</h2>
            <p className="text-xs text-gray-500 mt-0.5">{customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-gray-500 text-sm text-center py-8">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">No history found.</div>
          ) : (
            <div className="relative">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-5">
                {history.map((h: any) => (
                  <div key={h.id} className="flex gap-4 pl-8 relative">
                    <div className={`absolute left-0 top-1 w-5 h-5 rounded-full flex items-center justify-center
                      ${h.granted ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {h.granted
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        : <XCircle      className="w-3 h-3 text-gray-500"    />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${purposeColors(h.purpose)}`}>
                          {h.purpose}
                        </span>
                        <span className={`text-xs font-medium ${h.granted ? 'text-emerald-700' : 'text-gray-600'}`}>
                          {h.granted ? 'Granted' : 'Revoked'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {fmtDateTime(h.recorded_at)} ·{' '}
                        {h.recorded_by_name ? `by ${h.recorded_by_name}` : 'customer self-service'} ·{' '}
                        {h.source || 'unknown source'}
                        {h.channel ? ` · ${h.channel}` : ''}
                      </div>
                      {h.notes && (
                        <div className="text-xs text-gray-500 mt-1 italic">"{h.notes}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Consent Records
// ─────────────────────────────────────────────────────────────────────────────

function RecordsTab({ canEdit }: { canEdit: boolean }) {
  const [rawConsents, setRawConsents] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search,   setSearch]   = useState('');
  const [drawer,   setDrawer]   = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.listConsents()
      .then(r => setRawConsents(r.consents || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group flat rows by customer
  const byCustomer: Record<number, any> = {};
  for (const row of rawConsents) {
    if (!byCustomer[row.customer_id]) {
      byCustomer[row.customer_id] = {
        customer_id: row.customer_id,
        first_name:  row.first_name,
        last_name:   row.last_name,
        email:       row.email,
        purposes:    {}
      };
    }
    byCustomer[row.customer_id].purposes[row.purpose] = {
      granted:    row.granted,
      updated_at: row.updated_at
    };
  }

  let rows = Object.values(byCustomer) as any[];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    );
  }

  async function togglePurpose(customerId: number, purpose: string, currentGranted: boolean) {
    const key = `${customerId}-${purpose}`;
    setUpdating(key);
    try {
      await api.updateConsent(customerId, purpose, !currentGranted);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to update consent');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + export bar */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
        </div>
        <span className="text-sm text-gray-500">{rows.length} customers</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              {DISPLAY_PURPOSES.map(p => (
                <th key={p.key} className="text-center px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {p.label}
                </th>
              ))}
              {canEdit && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">History</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={DISPLAY_PURPOSES.length + 2} className="text-center py-8 text-gray-500 text-sm">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={DISPLAY_PURPOSES.length + 2} className="text-center py-8 text-gray-500 text-sm">No records found.</td></tr>
            ) : rows.map(row => (
              <tr key={row.customer_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{row.first_name} {row.last_name}</div>
                  <div className="text-xs text-gray-400">{row.email}</div>
                </td>
                {DISPLAY_PURPOSES.map(p => {
                  const rec = row.purposes[p.key];
                  const key = `${row.customer_id}-${p.key}`;
                  return (
                    <td key={p.key} className="px-2 py-3 text-center">
                      {canEdit && rec ? (
                        <button
                          onClick={() => togglePurpose(row.customer_id, p.key, rec.granted)}
                          disabled={updating === key}
                          title={rec.granted ? 'Click to revoke' : 'Click to grant'}
                          className="mx-auto flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                        >
                          {updating === key
                            ? <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            : <StatusDot granted={rec?.granted} />
                          }
                        </button>
                      ) : (
                        <div className="flex justify-center"><StatusDot granted={rec?.granted} /></div>
                      )}
                    </td>
                  );
                })}
                {canEdit && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setDrawer({ id: row.customer_id, name: `${row.first_name} ${row.last_name}` })}
                      className="text-xs text-brand-700 hover:underline font-medium flex items-center gap-1 mx-auto"
                    >
                      <History className="w-3 h-3" /> History
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawer && (
        <HistoryDrawer
          customerId={drawer.id}
          customerName={drawer.name}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Consent History Log
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [offset,  setOffset]  = useState(0);
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    api.listConsentHistory({ purpose: purpose || undefined, limit: LIMIT, offset })
      .then(r => setHistory(r.history || []))
      .finally(() => setLoading(false));
  }, [purpose, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purpose</label>
          <div className="relative">
            <select
              value={purpose}
              onChange={e => { setPurpose(e.target.value); setOffset(0); }}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="">All purposes</option>
              {DISPLAY_PURPOSES.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>
        <span className="text-sm text-gray-500 ml-auto">Showing {history.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purpose</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source · Channel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">Loading…</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No history found.</td></tr>
            ) : history.map(h => (
              <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(h.recorded_at)}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{h.first_name} {h.last_name}</div>
                  <div className="text-xs text-gray-400">{h.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${purposeColors(h.purpose)}`}>
                    {h.purpose}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${h.granted ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {h.granted
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Granted</>
                      : <><XCircle      className="w-3.5 h-3.5" /> Revoked</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {h.source || '—'} {h.channel ? `· ${h.channel}` : ''}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {h.recorded_by_name || 'Customer self-service'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          disabled={offset === 0}
          className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="text-xs text-gray-500">Page {Math.floor(offset / LIMIT) + 1}</span>
        <button
          onClick={() => setOffset(offset + LIMIT)}
          disabled={history.length < LIMIT}
          className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {/* DPDP note */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">Audit Trail (DPDP Section 6 / GDPR Art. 7)</span> — This log is append-only.
          Every consent change is recorded with timestamp, actor, source, and channel.
          Records are never modified or deleted.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Consent Analytics
// ─────────────────────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.consentAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 text-sm py-8 text-center">Loading analytics…</div>;
  if (!data)   return <div className="text-gray-500 text-sm py-8 text-center">Failed to load analytics.</div>;

  const { rates = [], trend = [], total_customers, withdrawn_analytics } = data;

  // Bar chart data
  const barData = rates.map((r: any) => ({
    purpose:    DISPLAY_PURPOSES.find(p => p.key === r.purpose)?.label || r.purpose,
    rate:       parseFloat(r.grant_rate) || 0,
    granted:    parseInt(r.granted_count),
    total:      parseInt(r.total)
  }));

  // Analytics grant rate from rates
  const analyticsRate = rates.find((r: any) => r.purpose === 'analytics');
  const mktEmailRate  = rates.find((r: any) => r.purpose === 'marketing_email');

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Customers</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total_customers}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Analytics Consent</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {analyticsRate ? `${analyticsRate.grant_rate}%` : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {analyticsRate ? `${analyticsRate.granted_count} / ${analyticsRate.total}` : ''}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Marketing Email</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {mktEmailRate ? `${mktEmailRate.grant_rate}%` : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {mktEmailRate ? `${mktEmailRate.granted_count} / ${mktEmailRate.total}` : ''}
          </div>
        </div>
        <div className="card p-4 border-amber-200">
          <div className="text-xs text-amber-600 uppercase tracking-wide font-medium">Withdrawn Analytics</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{withdrawn_analytics}</div>
          <div className="text-xs text-gray-400 mt-0.5">customers at risk</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grant rates by purpose */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Consent Grant Rate by Purpose</h3>
          <p className="text-xs text-gray-500 mb-4">% of customers who have granted each purpose</p>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="purpose" width={90}
                  tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Grant rate']}
                  contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="rate" fill="#E40000" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend over time */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Consent Activity — Last 30 Days</h3>
          <p className="text-xs text-gray-500 mb-4">Grant and revoke events per day</p>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickFormatter={v => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="granted" stroke="#10b981" strokeWidth={2} dot={false} name="Granted" />
                <Line type="monotone" dataKey="revoked"  stroke="#E40000" strokeWidth={2} dot={false} name="Revoked" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'records' | 'history' | 'analytics';

export default function ConsentPage() {
  return <AuthGuard><ConsentContent /></AuthGuard>;
}

function ConsentContent() {
  const [tab, setTab] = useState<Tab>('records');
  const user     = getUser();
  const canEdit  = user?.role === 'admin' || user?.role === 'compliance';
  const canAudit = user?.role === 'admin' || user?.role === 'compliance';

  const TABS: { id: Tab; label: string; icon: React.ElementType; gate?: boolean }[] = [
    { id: 'records',   label: 'Consent Records',   icon: ShieldCheck },
    { id: 'history',   label: 'Audit Log',          icon: History,   gate: !canAudit },
    { id: 'analytics', label: 'Analytics',          icon: BarChart2, gate: !canAudit }
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-500" /> Consent Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            DPDP / GDPR-aligned consent records, audit trail, and analytics
          </p>
        </div>
        {!canEdit && (
          <span className="badge bg-amber-50 text-amber-700">
            Read-only — requires compliance role
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.filter(t => !t.gate).map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'records'   && <RecordsTab  canEdit={canEdit} />}
      {tab === 'history'   && <HistoryTab  />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
