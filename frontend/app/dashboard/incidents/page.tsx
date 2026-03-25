'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Incident, Monitor } from '@/types';
import { incidentApi, monitorApi } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { Plus, Trash2, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';

const STATUS_FLOW = ['investigating', 'identified', 'monitoring', 'resolved'] as const;

export default function IncidentsPage() {
  const { addToast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [newIncident, setNewIncident] = useState({
    title: '',
    message: '',
    severity: 'minor',
    status: 'investigating',
    monitor_id: '' as string | undefined,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [incRes, monRes] = await Promise.all([
        incidentApi.list(),
        monitorApi.list(),
      ]);
      setIncidents(incRes.data);
      setMonitors(monRes.data);
    } catch {
      addToast({ title: 'Failed to load data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProgressStatus = async (incident: Incident) => {
    const currentIndex = STATUS_FLOW.indexOf(incident.status as typeof STATUS_FLOW[number]);
    if (currentIndex < 0 || currentIndex >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIndex + 1];

    try {
      await incidentApi.update(incident.id, { status: nextStatus });
      addToast({ title: `Status updated to ${nextStatus}`, variant: 'success' });
      loadData();
    } catch {
      addToast({ title: 'Failed to update status', variant: 'error' });
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await incidentApi.update(id, { status: 'resolved' });
      addToast({ title: 'Incident resolved!', variant: 'success' });
      loadData();
    } catch {
      addToast({ title: 'Failed to resolve incident', variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    try {
      await incidentApi.delete(id);
      addToast({ title: 'Incident deleted', variant: 'success' });
      loadData();
    } catch {
      addToast({ title: 'Failed to delete', variant: 'error' });
    }
  };

  const handleAddIncident = async () => {
    if (!newIncident.title) {
      addToast({ title: 'Title is required', variant: 'error' });
      return;
    }
    try {
      const payload = {
        ...newIncident,
        monitor_id: newIncident.monitor_id || undefined,
      };
      await incidentApi.create(payload);
      setShowAddModal(false);
      setNewIncident({ title: '', message: '', severity: 'minor', status: 'investigating', monitor_id: '' });
      addToast({ title: 'Incident reported', variant: 'success' });
      loadData();
    } catch {
      addToast({ title: 'Failed to create incident', variant: 'error' });
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical': return { color: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'major': return { color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
      default: return { color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'monitoring': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'identified': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
  };

  const filteredIncidents = incidents.filter((i) => {
    if (filter === 'active') return i.status !== 'resolved';
    if (filter === 'resolved') return i.status === 'resolved';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Incidents</h1>
          <p className="text-slate-500 mt-1">Track and manage service incidents</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === f
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full">
                {incidents.filter(i => i.status !== 'resolved').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {filter === 'active' ? 'No active incidents' : filter === 'resolved' ? 'No resolved incidents' : 'No incidents'}
              </h3>
              <p className="text-slate-500">
                {filter === 'active' ? 'All services are running smoothly!' : 'No incidents to show.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIncidents.map((incident) => {
                const sevCfg = getSeverityConfig(incident.severity);
                const currentIdx = STATUS_FLOW.indexOf(incident.status as typeof STATUS_FLOW[number]);
                const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

                return (
                  <div key={incident.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${sevCfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{incident.title}</h4>
                          {incident.message && (
                            <p className="text-sm text-slate-500 mt-1">{incident.message}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sevCfg.badge}`}>
                              {incident.severity}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(incident.status)}`}>
                              {incident.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(incident.created_at).toLocaleString()}
                            </span>
                            {incident.duration_minutes && incident.status === 'resolved' && (
                              <span className="text-xs text-slate-400">
                                Duration: {incident.duration_minutes < 60
                                  ? `${incident.duration_minutes} min`
                                  : `${Math.floor(incident.duration_minutes / 60)}h ${incident.duration_minutes % 60}m`}
                              </span>
                            )}
                          </div>

                          {/* Status progression */}
                          {incident.status !== 'resolved' && (
                            <div className="flex items-center gap-1 mt-3">
                              {STATUS_FLOW.map((s, i) => {
                                const isActive = STATUS_FLOW.indexOf(incident.status as typeof STATUS_FLOW[number]) >= i;
                                return (
                                  <div key={s} className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    <span className={`text-xs ${isActive ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                                      {s}
                                    </span>
                                    {i < STATUS_FLOW.length - 1 && (
                                      <ArrowRight className="w-3 h-3 text-slate-300 mx-0.5" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {incident.status !== 'resolved' && nextStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProgressStatus(incident)}
                            className="text-xs"
                          >
                            → {nextStatus}
                          </Button>
                        )}
                        {incident.status !== 'resolved' && (
                          <Button size="sm" variant="outline" onClick={() => handleResolve(incident.id)} className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Resolve
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(incident.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Incident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader>
              <CardTitle>Report Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g. API response times elevated"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Additional details about the incident..."
                  value={newIncident.message}
                  onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Affected Monitor (optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newIncident.monitor_id}
                  onChange={(e) => setNewIncident({ ...newIncident, monitor_id: e.target.value })}
                >
                  <option value="">None</option>
                  {monitors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={handleAddIncident}
                >
                  Report Incident
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
