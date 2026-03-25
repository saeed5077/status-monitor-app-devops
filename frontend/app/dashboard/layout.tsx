'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/AuthGuard';
import { authApi } from '@/lib/api';
import { Tenant } from '@/types';
import {
  LayoutDashboard,
  Activity,
  AlertCircle,
  Settings,
  LogOut,
  Globe,
  Users,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      const res = await authApi.getMe();
      setTenant(res.data.tenant);
    } catch {
      // If auth fails, AuthGuard handles redirect
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/monitors', label: 'Monitors', icon: Activity },
    { href: '/dashboard/incidents', label: 'Incidents', icon: AlertCircle },
    { href: '/dashboard/subscribers', label: 'Subscribers', icon: Users },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex h-screen">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed md:static inset-y-0 left-0 z-50
            w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            flex flex-col
          `}>
            {/* Logo & Tenant */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/25 transition-all">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  StatusPage
                </span>
              </Link>
              {tenant && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: tenant.brand_color }}
                      >
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                    <div className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }
                    `}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      {item.label}
                    </div>
                  </Link>
                );
              })}

              {/* Status page link */}
              {tenant && (
                <Link
                  href={`/status/${tenant.slug}`}
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all duration-200 mt-4"
                >
                  <ExternalLink className="w-5 h-5" />
                  View Status Page
                </Link>
              )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all duration-200 w-full"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Mobile header */}
            <div className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <span className="font-semibold text-sm">{tenant?.name || 'Dashboard'}</span>
            </div>

            <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
