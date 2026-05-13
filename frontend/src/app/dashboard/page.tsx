'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, Zap, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { AuthGuard } from '@/components/auth-guard';
import { api } from '@/lib/api';
import { fmtNum, fmtCurrency } from '@/lib/format';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [overview, setOverview] = useState<any>(null);
  const [dau, setDau] = useState<any[]>([]);
  const [eventsTrend, setEventsTrend] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.overview(),
      api.dau(),
      api.eventsTrend(),
      api.funnel()
    ]).then(([o, d, e, f]) => {
      setOverview(o);
      setDau(d.data || []);
      setEventsTrend(e.data || []);
      setFunnel(f.steps || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard…</div>;

  const kpis = [
    { label: 'Total Customers', value: fmtNum(overview?.total_customers || 0), icon: Users, change: '+12%', up: true },
    { label: 'Active Users (7d)', value: fmtNum(overview?.active_users || 0), icon: Activity, change: '+8%', up: true },
    { label: 'Total Events', value: fmtNum(overview?.total_events || 0), icon: Zap, change: '+24%', up: true },
    { label: 'Revenue', value: fmtCurrency(overview?.total_revenue || 0), icon: IndianRupee, change: '+5%', up: true }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your customer data and engagement</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-md bg-brand-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-700" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${k.up ? 'text-emerald-600' : 'text-brand-600'}`}>
                  {k.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {k.change}
                </span>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{k.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">User Activity</h3>
            <p className="text-xs text-gray-500">Daily active users — last 14 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={dau}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E40000" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#E40000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="dau" stroke="#E40000" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Event Volume</h3>
            <p className="text-xs text-gray-500">Total events per day — last 14 days</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={eventsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" fill="#E40000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="card p-5">
        <div className="mb-5">
          <h3 className="font-semibold text-gray-900">Conversion Funnel</h3>
          <p className="text-xs text-gray-500">Page View → Login → Purchase</p>
        </div>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const max = funnel[0]?.count || 1;
            const w = (step.count / max) * 100;
            return (
              <div key={step.name} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700">{step.name}</div>
                <div className="flex-1 h-9 rounded-md bg-gray-100 relative overflow-hidden">
                  <div
                    className="h-full flex items-center px-3 text-white text-xs font-semibold"
                    style={{
                      width: `${w}%`,
                      background: `linear-gradient(90deg, #E40000, ${i === 0 ? '#C20000' : i === 1 ? '#9F0000' : '#7A0000'})`
                    }}
                  >
                    {step.count} users
                  </div>
                </div>
                <div className="w-14 text-right text-sm font-bold text-gray-900">{step.conversion}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
