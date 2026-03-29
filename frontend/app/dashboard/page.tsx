'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Incident, Tenant } from '@/types';
import { monitorApi, incidentApi, authApi } from '@/lib/api';
import { Activity, CheckCircle, AlertCircle, Clock, ArrowRight, ExternalLink } from 'lucide-react';

export default function DashboardPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [userRes, monitorsRes, incidentsRes] = await Promise.all([
        authApi.getMe(),
        monitorApi.list(),
        incidentApi.list({ status: 'active' })
      ]);

      setTenant(userRes.data.tenant);
      setMonitors(monitorsRes.data);
      setIncidents(incidentsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const upMonitors = monitors.filter(m => m.status === 'operational').length;
  const downMonitors = monitors.filter(m => m.status === 'outage').length;
  const degradedMonitors = monitors.filter(m => m.status === 'degraded').length;
  const activeIncidents = incidents.length;

  const cards = [
    {
      title: 'Total Monitors',
      value: monitors.length,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/5 border border-emerald-500/10',
      iconBg: 'bg-emerald-500/10',
    },
    {
      title: 'Operational',
      value: upMonitors,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/5 border border-emerald-500/10',
      iconBg: 'bg-emerald-500/10',
    },
    {
      title: 'Down',
      value: downMonitors,
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/5 border border-red-500/10',
      iconBg: 'bg-red-500/10',
    },
    {
      title: 'Active Incidents',
      value: activeIncidents,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/5 border border-amber-500/10',
      iconBg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back to {tenant?.name}</p>
        </div>
        {tenant && (
          <Link
            href={`/status/${tenant.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View Status Page
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className={`border-0 shadow-sm ${card.bg} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monitor Status Overview */}
      <Card className="border border-gray-800 shadow-sm bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg text-gray-100">Monitor Status</CardTitle>
          <Link
            href="/dashboard/monitors"
            className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {monitors.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No monitors yet.</p>
              <Link
                href="/dashboard/monitors"
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium mt-2 inline-block"
              >
                Add your first monitor →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {monitors.slice(0, 6).map((monitor) => (
                <div
                  key={monitor.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      monitor.status === 'operational' ? 'bg-emerald-500 animate-pulse' :
                      monitor.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-200">{monitor.name}</p>
                      <p className="text-xs text-gray-500">{monitor.url}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    monitor.status === 'operational'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : monitor.status === 'degraded'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {monitor.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card className="border border-gray-800 shadow-sm bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg text-gray-100">Active Incidents</CardTitle>
          <Link
            href="/dashboard/incidents"
            className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
              <p className="text-gray-500">No active incidents — all services running smoothly!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                      incident.severity === 'critical' ? 'bg-red-500' :
                      incident.severity === 'major' ? 'bg-orange-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm text-gray-200">{incident.title}</p>
                      {incident.message && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{incident.message}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          incident.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          incident.severity === 'major' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs text-gray-400">
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(incident.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
