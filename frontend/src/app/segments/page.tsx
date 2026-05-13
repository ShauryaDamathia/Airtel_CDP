 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, RefreshCw, ChevronRight } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';

export default function SegmentsPage() {
  return <AuthGuard><SegmentsList /></AuthGuard>;
}

function SegmentsList() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.listSegments()
      .then(r => setSegments(r.segments || []))
      .catch((err: any) => {
        console.error(err);
        setError(err.message || 'Failed to load segments');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRecompute(id: number) {
    setRefreshing(id);
    try {
      await api.recomputeSegment(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to recompute');
    } finally {
      setRefreshing(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
        <p className="text-sm text-gray-500 mt-1">Rule-based customer groups for targeted activation</p>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : error ? (
        <div className="card p-5 border-brand-100 bg-brand-50 text-sm text-brand-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map(s => (
            <div key={s.id} className="card p-5 hover:border-brand-200 transition-colors flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-brand-700" />
                </div>
                <button
                  onClick={() => handleRecompute(s.id)}
                  disabled={refreshing === s.id}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-brand-600"
                  title="Recompute membership"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing === s.id ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <Link href={`/segments/${s.id}`} className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base">{s.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">{s.description}</p>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{s.member_count}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">members</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
