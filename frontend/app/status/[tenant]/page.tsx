'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { publicApi, subscriberApi } from '@/lib/api';
import { PublicStatusResponse, PublicMonitorStatus, PublicIncidentStatus } from '@/types';
import { CheckCircle, AlertTriangle, XCircle, Mail, ChevronDown, ChevronUp, Activity } from 'lucide-react';

export default function PublicStatusPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [data, setData] = useState<PublicStatusResponse | null>(null);
  const [history, setHistory] = useState<Record<string, { name: string; daily_stats: { date: string; uptime_percentage: number }[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      wsRef.current?.close();
    };
  }, [tenantSlug]);

  const loadData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        publicApi.getStatus(tenantSlug),
        publicApi.getHistory(tenantSlug, 90),
      ]);
      setData(statusRes.data);
      setHistory(historyRes.data.data || {});
      connectWebSocket();
    } catch (err: any) {
      setError('Status page not found');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
      const ws = new WebSocket(`${wsUrl}/api/ws/${tenantSlug}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status_update' || msg.type === 'incident_created' || msg.type === 'incident_resolved') {
            loadData();
          }
        } catch {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        setTimeout(() => connectWebSocket(), 5000);
      };
    } catch {}
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);
    setSubscribeMsg('');
    try {
      const res = await subscriberApi.subscribe(tenantSlug, email);
      setSubscribeMsg(res.data.message || 'Check your email to confirm!');
      setEmail('');
    } catch (err: any) {
      setSubscribeMsg(err.response?.data?.detail || 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  const getOverallStatusConfig = (status: string) => {
    switch (status) {
      case 'operational':
        return { label: 'All Systems Operational', bg: 'bg-emerald-500', icon: CheckCircle, textColor: 'text-emerald-50' };
      case 'degraded':
        return { label: 'Partial System Outage', bg: 'bg-amber-500', icon: AlertTriangle, textColor: 'text-amber-50' };
      case 'major_outage':
        return { label: 'Major System Outage', bg: 'bg-red-500', icon: XCircle, textColor: 'text-red-50' };
      default:
        return { label: 'Unknown Status', bg: 'bg-slate-500', icon: Activity, textColor: 'text-slate-50' };
    }
  };

  const getMonitorStatusDot = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-emerald-500';
      case 'degraded': return 'bg-amber-500';
      case 'outage': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'major': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'minor': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getUptimeBarColor = (pct: number) => {
    if (pct >= 99) return 'bg-emerald-500';
    if (pct >= 95) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Loading status page...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Status Page Not Found</h1>
          <p className="text-slate-500">The status page you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const { tenant, overall_status, monitors, active_incidents, recent_incidents } = data;
  const brandColor = tenant.brand_color || '#3B82F6';
  const statusConfig = getOverallStatusConfig(overall_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" style={{ '--brand-color': brandColor } as React.CSSProperties}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          {tenant.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-auto" />
          )}
          <h1 className="text-xl font-bold" style={{ color: brandColor }}>{tenant.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status Banner */}
        <div className={`${statusConfig.bg} rounded-xl p-6 flex items-center gap-4 shadow-lg`}>
          <StatusIcon className={`w-8 h-8 ${statusConfig.textColor}`} />
          <div>
            <h2 className={`text-xl font-bold ${statusConfig.textColor}`}>{statusConfig.label}</h2>
            <p className={`text-sm ${statusConfig.textColor} opacity-80`}>
              Last updated {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Active Incidents */}
        {active_incidents.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Incidents</h3>
            {active_incidents.map((incident) => (
              <div key={incident.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{incident.title}</h4>
                    {incident.message && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{incident.message}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadge(incident.severity)}`}>
                    {incident.severity}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
                    {incident.status}
                  </span>
                  {incident.affected_monitor && <span>Affecting: {incident.affected_monitor}</span>}
                  <span>Started: {new Date(incident.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Monitor List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Services</h3>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {monitors.map((monitor) => {
              const monitorHistory = history[monitor.id]?.daily_stats || [];
              // Show last 90 days, pad with empty if needed
              const last90 = monitorHistory.slice(-90);

              return (
                <div key={monitor.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getMonitorStatusDot(monitor.status)} ${monitor.status === 'operational' ? 'animate-pulse' : ''}`} />
                      <span className="font-medium text-slate-900 dark:text-white">{monitor.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{monitor.uptime_percentage_30d.toFixed(2)}% uptime</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        monitor.status === 'operational'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : monitor.status === 'degraded'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {monitor.status}
                      </span>
                    </div>
                  </div>

                  {/* 90-day Uptime Bar */}
                  <div className="flex gap-[2px] h-8 items-end" title="90-day uptime history">
                    {Array.from({ length: 90 }, (_, i) => {
                      const stat = last90[i];
                      const pct = stat ? stat.uptime_percentage : 100;
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm min-w-[2px] transition-all hover:opacity-80 ${
                            stat ? getUptimeBarColor(pct) : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                          style={{ height: `${Math.max(20, pct)}%` }}
                          title={stat ? `${stat.date}: ${pct.toFixed(1)}%` : 'No data'}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>90 days ago</span>
                    <span>Today</span>
                  </div>
                </div>
              );
            })}

            {monitors.length === 0 && (
              <div className="p-8 text-center text-slate-500">No monitors configured yet.</div>
            )}
          </div>
        </div>

        {/* Resolved Incidents */}
        {recent_incidents.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors"
            >
              Resolved Incidents ({recent_incidents.length})
              {showResolved ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showResolved && (
              <div className="space-y-3">
                {recent_incidents.map((incident) => (
                  <div key={incident.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm opacity-75">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-slate-700 dark:text-slate-300">{incident.title}</h4>
                        {incident.message && (
                          <p className="text-sm text-slate-500 mt-1">{incident.message}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium">
                        Resolved
                      </span>
                    </div>
                    <div className="mt-2 flex gap-3 text-xs text-slate-400">
                      {incident.affected_monitor && <span>{incident.affected_monitor}</span>}
                      {incident.resolved_at && <span>Resolved: {new Date(incident.resolved_at).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscribe Form */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5" style={{ color: brandColor }} />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Subscribe to Updates</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Get notified when services go down or incidents are resolved.
          </p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
            />
            <button
              type="submit"
              disabled={subscribing}
              className="px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {subscribeMsg && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{subscribeMsg}</p>
          )}
        </div>
      </div>

      {/* Footer - Pure White Label */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-8">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} {tenant.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
