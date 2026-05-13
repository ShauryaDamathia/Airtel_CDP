'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, ShieldCheck } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { fmtCurrency, fmtDateTime, timeAgo, initials } from '@/lib/format';

export default function ProfileDetailPage({ params }: { params: { id: string } }) {
  return <AuthGuard><ProfileDetail params={params} /></AuthGuard>;
}

function ProfileDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomer(parseInt(id))
      .then(setData)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!data) return <div className="text-gray-500">Customer not found</div>;

  const { customer, purchases, events, segments, consents } = data;

  return (
    <div className="space-y-5">
      <Link href="/profiles" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> All profiles
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xl">
            {initials(customer.first_name, customer.last_name)}
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Customer #{customer.id}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {customer.first_name} {customer.last_name}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-600">
              {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>}
              {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>}
              {customer.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {customer.city}, {customer.country}</span>}
            </div>
          </div>
          <span className={`badge capitalize ${
            customer.lifecycle_stage === 'vip' ? 'bg-brand-50 text-brand-700' :
            customer.lifecycle_stage === 'active' ? 'bg-emerald-50 text-emerald-700' :
            customer.lifecycle_stage === 'dormant' ? 'bg-amber-50 text-amber-700' :
            'bg-blue-50 text-blue-700'
          }`}>{customer.lifecycle_stage}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Spent" value={fmtCurrency(customer.total_spent || 0)} />
        <Stat label="Purchases" value={purchases.length.toString()} />
        <Stat label="Total Events" value={(customer.total_events || 0).toString()} />
        <Stat label="Last Seen" value={customer.last_seen_at ? timeAgo(customer.last_seen_at) : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Activity timeline */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-gray-500 text-sm">No events yet</div>
            ) : events.map((event: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  event.event_type === 'purchase' ? 'bg-emerald-500' :
                  event.event_type === 'login' ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 capitalize">
                    {event.event_type.replace('_', ' ')}
                  </div>
                  {event.properties?.page && (
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{event.properties.page}</div>
                  )}
                  {event.properties?.amount && (
                    <div className="text-xs text-gray-500 mt-0.5">{fmtCurrency(event.properties.amount)} — {event.properties.product_name}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(event.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {/* Segments */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Segments</h3>
            {segments.length === 0 ? (
              <div className="text-gray-500 text-sm">No segments</div>
            ) : (
              <div className="space-y-2">
                {segments.map((s: any) => (
                  <Link key={s.id} href={`/segments/${s.id}`}
                        className="flex items-center justify-between p-2 rounded-md bg-brand-50 hover:bg-brand-100">
                    <span className="text-sm font-medium text-brand-700">{s.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Consents */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Consent Status
            </h3>
            {consents.length === 0 ? (
              <div className="text-gray-500 text-sm">No consent records</div>
            ) : (
              <div className="space-y-2">
                {consents.map((c: any) => (
                  <div key={c.purpose} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-gray-700">{c.purpose}</span>
                    <span className={`badge ${c.granted ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.granted ? 'Granted' : 'Denied'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent purchases */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Recent Purchases
            </h3>
            {purchases.length === 0 ? (
              <div className="text-gray-500 text-sm">No purchases</div>
            ) : (
              <div className="space-y-2">
                {purchases.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{p.product_name}</div>
                      <div className="text-xs text-gray-500">{fmtDateTime(p.created_at)}</div>
                    </div>
                    <div className="font-mono text-gray-900 shrink-0">{fmtCurrency(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
