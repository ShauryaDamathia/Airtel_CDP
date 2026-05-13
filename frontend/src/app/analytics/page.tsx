'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { fmtCurrency } from '@/lib/format';

export default function AnalyticsPage() {
  return <AuthGuard><AnalyticsContent /></AuthGuard>;
}

function AnalyticsContent() {
  const [dau, setDau] = useState<any[]>([]);
  const [eventsTrend, setEventsTrend] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      api.dau(),
      api.eventsTrend(),
      api.revenueTrend(),
      api.funnel()
    ]).then(([d, e, r, f]) => {
      setDau(d.data || []);
      setEventsTrend(e.data || []);
      setRevenueTrend(r.data || []);
      setFunnel(f.steps || []);
    }).catch((err: any) => {
      console.error(err);
      setError(err.message || 'Failed to load analytics');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading…</div>;

  if (error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Customer behavior, engagement, and revenue trends</p>
        </div>
        <div className="card p-5 border-brand-100 bg-brand-50 text-sm text-brand-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Customer behavior, engagement, and revenue trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Chart title="Daily Active Users" subtitle="Unique users per day — last 14 days">
          <AreaChart data={dau}>
            <defs>
              <linearGradient id="dau-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E40000" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#E40000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
            <Area type="monotone" dataKey="dau" stroke="#E40000" strokeWidth={2} fill="url(#dau-g)" />
          </AreaChart>
        </Chart>

        <Chart title="Event Volume" subtitle="Total events per day — last 14 days">
          <BarChart data={eventsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
            <Bar dataKey="count" fill="#E40000" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>

        <Chart title="Revenue Trend" subtitle="Daily revenue — last 14 days">
          <LineChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + (v / 1000).toFixed(0) + 'k'} />
            <Tooltip
              contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }}
              formatter={(v: any) => fmtCurrency(v)}
            />
            <Line type="monotone" dataKey="revenue" stroke="#E40000" strokeWidth={2} dot={{ r: 3, fill: '#E40000' }} />
          </LineChart>
        </Chart>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Conversion Funnel</h3>
            <p className="text-xs text-gray-500">Page View → Login → Purchase</p>
          </div>
          <div className="space-y-3 mt-6">
            {funnel.map((step, i) => {
              const max = funnel[0]?.count || 1;
              const w = (step.count / max) * 100;
              return (
                <div key={step.name} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-700">{step.name}</div>
                  <div className="flex-1 h-8 rounded-md bg-gray-100 relative overflow-hidden">
                    <div
                      className="h-full flex items-center px-2.5 text-white text-xs font-semibold"
                      style={{
                        width: `${w}%`,
                        background: `linear-gradient(90deg, #E40000, ${i === 0 ? '#C20000' : i === 1 ? '#9F0000' : '#7A0000'})`
                      }}
                    >
                      {step.count}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-bold text-gray-900">{step.conversion}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chart({ title, subtitle, children }: any) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
