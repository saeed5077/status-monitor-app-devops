'use client';

import { useState } from 'react';
import { CheckCircle, Mail, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import Link from 'next/link';

// Static demo data — no API calls needed
const DEMO_DATA = {
  tenant: { name: 'Acme Inc.', brand_color: '#10b981' },
  overall_status: 'operational',
  monitors: [
    { id: '1', name: 'API Server', status: 'operational', uptime: 99.98 },
    { id: '2', name: 'Web Application', status: 'operational', uptime: 99.95 },
    { id: '3', name: 'Database Cluster', status: 'operational', uptime: 100.0 },
    { id: '4', name: 'CDN / Static Assets', status: 'operational', uptime: 99.99 },
    { id: '5', name: 'Payment Gateway', status: 'operational', uptime: 99.90 },
  ],
  resolved_incidents: [
    {
      id: '1',
      title: 'Elevated API latency',
      message: 'Response times were 2x normal due to a database query optimization issue.',
      severity: 'minor',
      resolved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: '2',
      title: 'CDN cache invalidation delay',
      message: 'Static assets were served stale for ~15 minutes after a deployment.',
      severity: 'minor',
      resolved_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ],
};

// Generate fake 90-day uptime bars (high uptime with a few dips)
function generateUptimeBars() {
  return Array.from({ length: 90 }, (_, i) => {
    const rand = Math.random();
    if (i === 42) return 94.5;   // a small dip
    if (i === 71) return 97.2;   // another dip
    if (rand < 0.05) return 98 + Math.random() * 2;
    return 99.5 + Math.random() * 0.5;
  });
}

const uptimeBarsMap: Record<string, number[]> = {};
DEMO_DATA.monitors.forEach(m => { uptimeBarsMap[m.id] = generateUptimeBars(); });

export default function DemoStatusPage() {
  const [showResolved, setShowResolved] = useState(false);
  const brandColor = DEMO_DATA.tenant.brand_color;

  const getUptimeBarColor = (pct: number) => {
    if (pct >= 99) return 'bg-emerald-500';
    if (pct >= 95) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Demo banner */}
      <div className="bg-emerald-600 text-white text-center py-2.5 text-sm font-medium">
        🎯 This is a demo status page.{' '}
        <Link href="/register" className="underline font-bold hover:text-emerald-200 transition-colors">
          Create your own for free →
        </Link>
      </div>

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: brandColor }}>
            A
          </div>
          <h1 className="text-xl font-bold" style={{ color: brandColor }}>{DEMO_DATA.tenant.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status */}
        <div className="bg-emerald-500 rounded-xl p-6 flex items-center gap-4 shadow-lg">
          <CheckCircle className="w-8 h-8 text-emerald-50" />
          <div>
            <h2 className="text-xl font-bold text-emerald-50">All Systems Operational</h2>
            <p className="text-sm text-emerald-50 opacity-80">Last updated {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-100">Services</h3>
          <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm divide-y divide-gray-800">
            {DEMO_DATA.monitors.map((monitor) => {
              const bars = uptimeBarsMap[monitor.id];
              return (
                <div key={monitor.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium text-gray-100">{monitor.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{monitor.uptime.toFixed(2)}% uptime</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        operational
                      </span>
                    </div>
                  </div>

                  {/* 90-day bars */}
                  <div className="flex gap-[2px] h-8 items-end">
                    {bars.map((pct, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm min-w-[2px] transition-all hover:opacity-80 ${getUptimeBarColor(pct)}`}
                        style={{ height: `${Math.max(20, pct)}%` }}
                        title={`Day ${90 - i}: ${pct.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="space-y-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-100 hover:text-emerald-400 transition-colors"
          >
            Past Incidents ({DEMO_DATA.resolved_incidents.length})
            {showResolved ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showResolved && (
            <div className="space-y-3">
              {DEMO_DATA.resolved_incidents.map((incident) => (
                <div key={incident.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-sm opacity-75">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-300">{incident.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{incident.message}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                      Resolved
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Resolved: {new Date(incident.resolved_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe (demo) */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5" style={{ color: brandColor }} />
            <h3 className="text-lg font-semibold text-gray-100">Subscribe to Updates</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">Get notified when services go down or incidents are resolved.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-sm text-gray-200"
              disabled
            />
            <Link href="/register">
              <button className="px-6 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all" style={{ backgroundColor: brandColor }}>
                Subscribe
              </button>
            </Link>
          </div>
          <p className="mt-2 text-xs text-emerald-500">Sign up to enable email subscriptions on your own status page.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 mt-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 mb-2">© {new Date().getFullYear()} Acme Inc.</p>
          <Link href="/register" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Want a status page like this? Get started free →
          </Link>
        </div>
      </footer>
    </div>
  );
}
