'use client';

import { useEffect, useState, useCallback } from 'react';
import { GitMerge, CheckCircle2, XCircle, Clock, Info, AlertTriangle } from 'lucide-react';
import { AuthGuard, } from '@/components/auth-guard';
import { api, getUser } from '@/lib/api';
import { fmtDateTime, timeAgo } from '@/lib/format';

export default function MatchesPage() {
  return <AuthGuard><MatchesContent /></AuthGuard>;
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected';

function MatchesContent() {
  const [matches,  setMatches]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<number | null>(null);
  const [filter,   setFilter]   = useState<FilterStatus>('pending');
  const user    = getUser();
  const canAct  = user?.role === 'admin' || user?.role === 'compliance';

  const load = useCallback(() => {
    setLoading(true);
    api.listPendingMatches()
      .then(r => setMatches(r.matches || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleConfirm(id: number) {
    setActing(id);
    try {
      await api.confirmMatch(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id: number) {
    setActing(id);
    try {
      await api.rejectMatch(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setActing(null);
    }
  }

  const filtered = filter === 'all'
    ? matches
    : matches.filter(m => m.status === filter);

  const counts = {
    all:       matches.length,
    pending:   matches.filter(m => m.status === 'pending').length,
    confirmed: matches.filter(m => m.status === 'confirmed').length,
    rejected:  matches.filter(m => m.status === 'rejected').length
  };

  function statusBadge(status: string) {
    if (status === 'pending')   return <span className="badge bg-amber-50 text-amber-700">Pending</span>;
    if (status === 'confirmed') return <span className="badge bg-emerald-50 text-emerald-700">Confirmed</span>;
    if (status === 'rejected')  return <span className="badge bg-gray-100 text-gray-600">Rejected</span>;
    return null;
  }

  function scoreColor(score: number) {
    if (score >= 0.95) return 'text-emerald-700 bg-emerald-50';
    if (score >= 0.88) return 'text-amber-700 bg-amber-50';
    return 'text-orange-700 bg-orange-50';
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitMerge className="w-6 h-6 text-brand-500" /> Identity Match Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review fuzzy-matched identifiers flagged during event ingestion. Confirm accurate matches or reject false positives.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 leading-relaxed">
          <span className="font-semibold">How fuzzy matching works:</span> When an incoming email doesn't exactly match
          any known customer but is {'>'}82% similar (e.g. <code className="bg-blue-100 px-0.5 rounded">gmial.com</code> vs{' '}
          <code className="bg-blue-100 px-0.5 rounded">gmail.com</code>), the CDP assigns the event to the matched customer
          and queues it here for review. Events are never lost — this queue is for auditing only.
        </p>
      </div>

      {/* Stats + filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'confirmed', 'rejected'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              filter === f
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Incoming Identifier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Matched Customer</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Similarity</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Flagged</th>
              {canAct && (
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canAct ? 6 : 5} className="text-center py-10 text-gray-500 text-sm">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={canAct ? 6 : 5} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="text-sm">
                      {filter === 'pending'
                        ? 'No pending matches — all identifiers resolved exactly.'
                        : `No ${filter} matches.`}
                    </span>
                  </div>
                </td>
              </tr>
            ) : filtered.map(m => {
              const score = parseFloat(m.similarity_score) || 0;
              const isPending = m.status === 'pending';
              return (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {/* Incoming */}
                  <td className="px-5 py-3">
                    <div className="font-mono text-sm text-gray-900">{m.incoming_identifier}</div>
                    <div className="text-xs text-gray-400 capitalize mt-0.5">{m.identifier_type}</div>
                  </td>

                  {/* Matched customer */}
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {m.first_name} {m.last_name}
                      <span className="ml-2 text-xs text-gray-400">#{m.matched_customer_id}</span>
                    </div>
                    <div className="font-mono text-xs text-gray-500">{m.matched_email}</div>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${scoreColor(score)}`}>
                      {Math.round(score * 100)}%
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">{statusBadge(m.status)}</td>

                  {/* Time */}
                  <td className="px-5 py-3">
                    <div className="text-xs text-gray-500">{timeAgo(m.created_at)}</div>
                    {m.reviewed_at && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Reviewed {timeAgo(m.reviewed_at)}
                        {m.reviewed_by_name ? ` by ${m.reviewed_by_name}` : ''}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  {canAct && (
                    <td className="px-5 py-3 text-right">
                      {isPending ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleConfirm(m.id)}
                            disabled={acting === m.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md
                                       bg-emerald-50 text-emerald-700 border border-emerald-200
                                       hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {acting === m.id
                              ? <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Confirm
                          </button>
                          <button
                            onClick={() => handleReject(m.id)}
                            disabled={acting === m.id}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md
                                       bg-gray-50 text-gray-700 border border-gray-200
                                       hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {acting === m.id
                              ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role note */}
      {!canAct && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Read-only view. Confirm / reject requires admin or compliance role.
        </div>
      )}
    </div>
  );
}
