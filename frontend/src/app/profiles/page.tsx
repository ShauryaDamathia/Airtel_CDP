'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { fmtCurrency, timeAgo, initials } from '@/lib/format';

export default function ProfilesPage() {
  return <AuthGuard><ProfilesList /></AuthGuard>;
}

function ProfilesList() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listCustomers(search).then(r => {
      setCustomers(r.customers || []);
      setLoading(false);
    });
  }, [search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profiles</h1>
        <p className="text-sm text-gray-500 mt-1">Unified customer profiles built from event data</p>
      </div>

      {/* Search */}
      <div className="card p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm placeholder:text-gray-400 bg-transparent"
        />
        <span className="text-xs text-gray-500 mr-2">{customers.length} profiles</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Spent</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Events</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">No customers found.</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <Link href={`/profiles/${c.id}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold text-xs">
                      {initials(c.first_name, c.last_name)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {c.first_name} {c.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">{c.city || '—'}</td>
                <td className="px-5 py-3"><StageBadge stage={c.lifecycle_stage} /></td>
                <td className="px-5 py-3 text-right text-sm font-mono text-gray-900">{fmtCurrency(c.total_spent || 0)}</td>
                <td className="px-5 py-3 text-right text-sm text-gray-700">{c.total_events || 0}</td>
                <td className="px-5 py-3 text-right text-xs text-gray-500">{c.last_seen_at ? timeAgo(c.last_seen_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    new:     'bg-blue-50 text-blue-700',
    active:  'bg-emerald-50 text-emerald-700',
    dormant: 'bg-amber-50 text-amber-700',
    vip:     'bg-brand-50 text-brand-700'
  };
  return (
    <span className={`badge capitalize ${map[stage] || 'bg-gray-100 text-gray-700'}`}>
      {stage}
    </span>
  );
}
