'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Layers, BarChart3,
  ShieldCheck, LogOut, Database, GitMerge
} from 'lucide-react';
import { getUser, setToken, setUser } from '@/lib/api';

// Nav items that are always visible to all roles
const NAV_ALWAYS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profiles',  label: 'Profiles',  icon: Users },
  { href: '/segments',  label: 'Segments',  icon: Layers },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 }
];

// Nav items visible only to specific roles
const NAV_RESTRICTED = [
  {
    href:   '/consent',
    label:  'Consent',
    icon:   ShieldCheck,
    roles:  ['admin', 'analyst', 'compliance']   // hidden from marketer
  },
  {
    href:   '/matches',
    label:  'ID Matches',
    icon:   GitMerge,
    roles:  ['admin', 'compliance']              // fuzzy match review
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUserState] = useState<any>(null);

  useEffect(() => { setUserState(getUser()); }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
    router.push('/login');
  }

  const role = user?.role || '';

  const visibleNav = [
    ...NAV_ALWAYS,
    ...NAV_RESTRICTED.filter(item => item.roles.includes(role))
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-brand-500 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base text-gray-900 leading-none">CDP</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User panel */}
      <div className="p-3 border-t border-gray-200">
        <div className="px-2 py-2 mb-1">
          <div className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'User'}</div>
          <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="badge bg-brand-50 text-brand-700 capitalize">{user?.role}</span>
            {user?.role === 'marketer' && (
              <span className="badge bg-amber-50 text-amber-700 text-[10px]">PII masked</span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
