'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { api, getUser } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

export default function ConsentPage() {
  return <AuthGuard><ConsentContent /></AuthGuard>;
}

function ConsentContent() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const user = getUser();
  const canEdit = user?.role === 'admin' || user?.role === 'compliance';

  function load() {
    setLoading(true);
    api.listConsents()
      .then(r => setConsents(r.consents || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggle(consent: any) {
    if (!canEdit) return;
    const key = `${consent.customer_id}-${consent.purpose}`;
    setUpdating(key);
    try {
      await api.updateConsent(consent.customer_id, consent.purpose, !consent.granted);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to update consent');
    } finally {
      setUpdating(null);
    }
  }

  // Stats summary
  const total = consents.length;
  const granted = consents.filter(c => c.granted).length;
  const denied = total - granted;
  const marketingGranted = consents.filter(c => c.purpose === 'marketing' && c.granted).length;
  const analyticsGranted = consents.filter(c => c.purpose === 'analytics' && c.granted).length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-500" /> Consent Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Customer consent records for analytics and marketing purposes</p>
        </div>
        {!canEdit && (
          <span className="badge bg-amber-50 text-amber-700">Read-only — requires compliance role</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Records" value={total} accent="brand" />
        <Stat label="Granted" value={granted} accent="emerald" />
        <Stat label="Analytics Granted" value={analyticsGranted} accent="blue" />
        <Stat label="Marketing Granted" value={marketingGranted} accent="purple" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purpose</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</th>
              {canEdit && <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canEdit ? 5 : 4} className="text-center py-8 text-gray-500 text-sm">Loading…</td></tr>
            ) : consents.map(c => {
              const key = `${c.customer_id}-${c.purpose}`;
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge capitalize ${c.purpose === 'marketing' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {c.purpose}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${c.granted ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.granted ? '✓ Granted' : '✗ Denied'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDateTime(c.updated_at)}</td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggle(c)}
                        disabled={updating === key}
                        className="text-xs btn-secondary py-1.5 px-3"
                      >
                        {updating === key ? '…' : (c.granted ? 'Revoke' : 'Grant')}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  const colors: Record<string, string> = {
    brand:  'bg-brand-50 text-brand-700',
    emerald:'bg-emerald-50 text-emerald-700',
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700'
  };
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className="flex items-end justify-between mt-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <span className={`badge ${colors[accent]}`}>{accent}</span>
      </div>
    </div>
  );
}
