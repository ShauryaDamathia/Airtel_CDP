'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database } from 'lucide-react';
import { api, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@cdp.local');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 bg-brand-500 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-brand-700/40 translate-y-1/3 -translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-xl leading-none">CDP</div>
              <div className="text-xs text-white/80 mt-1">Customer Data Platform</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Unify customer data.<br />
            Drive better decisions.
          </h1>
          <p className="text-white/90 text-lg leading-relaxed max-w-md">
            CDP for unified customer intelligence and analytics.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          {[
            { label: 'Customers', value: '20+' },
            { label: 'Events', value: '600+' },
            { label: 'Segments', value: '3' }
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-lg p-3">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-md bg-brand-500 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CDP Platform</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wide">
              Demo accounts
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between"><span>admin@cdp.local</span><span className="text-gray-500">admin</span></div>
              <div className="flex justify-between"><span>analyst@cdp.local</span><span className="text-gray-500">analyst</span></div>
              <div className="flex justify-between"><span>marketer@cdp.local</span><span className="text-gray-500">marketer</span></div>
              <div className="flex justify-between"><span>compliance@cdp.local</span><span className="text-gray-500">compliance</span></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Password: <span className="font-mono">password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
