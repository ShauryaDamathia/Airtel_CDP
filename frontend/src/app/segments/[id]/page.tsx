'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { fmtCurrency, timeAgo, initials } from '@/lib/format';

export default function SegmentDetailPage({ params }: { params: { id: string } }) {
  return <AuthGuard><SegmentDetail params={params} /></AuthGuard>;
}

function SegmentDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getSegment(parseInt(id))
      .then(setData)
      .catch((err: any) => {
        console.error(err);
        setError(err.message || 'Failed to load segment');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error) return <div className="card p-5 border-brand-100 bg-brand-50 text-sm text-brand-700">{error}</div>;
  if (!data) return <div>Not found</div>;

  const { segment, members } = data;

  // Friendly rule descriptions
  const ruleDescription: Record<string, string> = {
    high_spenders:   'Customers with total spending greater than ₹30,000',
    active_users:    'Customers active in the last 7 days',
    inactive_users:  'Customers inactive for more than 30 days'
  };

  return (
    <div className="space-y-5">
      <Link href="/segments" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All segments
      </Link>

      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md bg-brand-500 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{segment.name}</h1>
            <p className="text-gray-500 mt-1">{segment.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{members.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">members</div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5 tracking-wide">Rule</div>
          <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-md font-mono">
            {ruleDescription[segment.rule_type] || segment.rule_type}
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Members</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Spent</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500 text-sm">No members in this segment.</td></tr>
            ) : members.map((m: any) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  <Link href={`/profiles/${m.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold text-xs">
                      {initials(m.first_name, m.last_name)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-sm text-gray-700">{m.city || '—'}</td>
                <td className="px-5 py-2.5">
                  <span className="badge bg-gray-100 text-gray-700 capitalize">{m.lifecycle_stage}</span>
                </td>
                <td className="px-5 py-2.5 text-right text-sm font-mono">{fmtCurrency(m.total_spent)}</td>
                <td className="px-5 py-2.5 text-right text-xs text-gray-500">{timeAgo(m.last_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
