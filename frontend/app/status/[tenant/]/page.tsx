'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { PublicStatusResponse } from '@/types';
import { publicApi, subscriberApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, AlertCircle, AlertTriangle, XCircle, Bell } from 'lucide-react';

export default function StatusPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [data, setData] = useState<PublicStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const loadStatus = async () => {
    try {
      const response = await publicApi.getStatus(tenantSlug);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();

    // WebSocket connection for real-time updates
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/api/ws/${tenantSlug}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'status_update' || message.type === 'incident_created' || message.type === 'incident_resolved') {
        loadStatus();
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, [tenantSlug]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subscriberApi.subscribe(tenantSlug, email);
      setSubscribed(true);
      setEmail('');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'outage': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'major_outage': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Status Page Not Found</h1>
        </div>
      </div>
    );
  }

  const brandColor = data.tenant.brand_color || '#3B82F6';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {data.tenant.logo_url && (
            <img src={data.tenant.logo_url} alt="Logo" className="h-12 w-auto" />
          )}
          <h1 className="text-3xl font-bold" style={{ color: brandColor }}>
            {data.tenant.name}
          </h1>
        </div>

        {/* Overall Status */}
        <div className={`${getOverallStatusColor(data.overall_status)} text-white px-6 py-4 rounded-lg mb-8 text-center`}>
          <p className="text-lg font-medium">
            {data.overall_status === 'operational' ? 'All Systems Operational' :
             data.overall_status === 'degraded' ? 'Partial System Outage' :
             'Major System Outage'}
          </p>
        </div>

        {/* Monitors */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border mb-8">
          {data.monitors.map((monitor) => (
            <div key={monitor.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                {getStatusIcon(monitor.status)}
                <span className="font-medium">{monitor.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {monitor.uptime_percentage_30d}% uptime
              </div>
            </div>
          ))}
        </div>

        {/* Active Incidents */}
        {data.active_incidents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Active Incidents</h2>
            {data.active_incidents.map((incident) => (
              <div key={incident.id} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">{incident.title}</h3>
                    {incident.message && (
                      <p className="text-sm text-muted-foreground mt-1">{incident.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        incident.severity === 'major' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {incident.severity}
                      </span>
                      <span className="text-muted-foreground">{incident.status}</span>
                      {incident.affected_monitor && (
                        <span className="text-muted-foreground">• {incident.affected_monitor}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscribe */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5" style={{ color: brandColor }} />
            <h2 className="text-lg font-medium">Subscribe to Updates</h2>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Please check your email to confirm subscription.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" style={{ backgroundColor: brandColor }}>
                Subscribe
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground mt-12">
          <p>Powered by StatusPage SaaS</p>
        </footer>
      </div>
    </div>
  );
}
