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
      case 'critical': return { color: 'bg-red-500', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' };
      case 'major': return { color: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' };
      default: return { color: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'monitoring': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'identified': return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      default: return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
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
          <h1 className="text-3xl font-bold text-gray-100">Incidents</h1>
          <p className="text-gray-500 mt-1">Track and manage service incidents</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === f
                ? 'bg-gray-700 shadow-sm text-gray-100'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && (
              <span className="ml-1.5 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                {incidents.filter(i => i.status !== 'resolved').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <Card className="border border-gray-800 shadow-sm bg-gray-900">
        <CardContent className="p-0">
          {filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                {filter === 'active' ? 'No active incidents' : filter === 'resolved' ? 'No resolved incidents' : 'No incidents'}
              </h3>
              <p className="text-gray-500">
                {filter === 'active' ? 'All services are running smoothly!' : 'No incidents to show.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredIncidents.map((incident) => {
                const sevCfg = getSeverityConfig(incident.severity);
                const currentIdx = STATUS_FLOW.indexOf(incident.status as typeof STATUS_FLOW[number]);
                const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

                return (
                  <div key={incident.id} className="p-5 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${sevCfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-100">{incident.title}</h4>
                          {incident.message && (
                            <p className="text-sm text-gray-500 mt-1">{incident.message}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sevCfg.badge}`}>
                              {incident.severity}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(incident.status)}`}>
                              {incident.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(incident.created_at).toLocaleString()}
                            </span>
                            {incident.duration_minutes && incident.status === 'resolved' && (
                              <span className="text-xs text-gray-500">
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
                                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                                    <span className={`text-xs ${isActive ? 'text-emerald-400 font-medium' : 'text-gray-600'}`}>
                                      {s}
                                    </span>
                                    {i < STATUS_FLOW.length - 1 && (
                                      <ArrowRight className="w-3 h-3 text-gray-700 mx-0.5" />
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
                            className="text-xs border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            → {nextStatus}
                          </Button>
                        )}
                        {incident.status !== 'resolved' && (
                          <Button size="sm" variant="outline" onClick={() => handleResolve(incident.id)} className="text-xs text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl border border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-100">Report Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Title</label>
                <Input
                  placeholder="e.g. API response times elevated"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Description</label>
                <textarea
                  className="w-full h-20 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Additional details about the incident..."
                  value={newIncident.message}
                  onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Severity</label>
                <select
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-200"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Affected Monitor (optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-gray-200"
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
                <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
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
