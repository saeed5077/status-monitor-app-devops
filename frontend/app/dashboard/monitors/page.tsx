'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, MonitorWithUptime, UptimeStats } from '@/types';
import { monitorApi } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { Plus, Trash2, Edit, X, BarChart3, Clock, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MonitorsPage() {
  const { addToast } = useToast();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [selectedMonitor, setSelectedMonitor] = useState<MonitorWithUptime | null>(null);
  const [uptimeLoading, setUptimeLoading] = useState(false);
  const [newMonitor, setNewMonitor] = useState({ name: '', url: '', check_interval_seconds: 60 });
  const [editForm, setEditForm] = useState({ name: '', url: '', check_interval_seconds: 60 });

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await monitorApi.list();
      setMonitors(response.data);
    } catch {
      addToast({ title: 'Failed to load monitors', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMonitor = async () => {
    if (!newMonitor.name || !newMonitor.url) {
      addToast({ title: 'Please fill in all fields', variant: 'error' });
      return;
    }
    try {
      await monitorApi.create(newMonitor);
      setShowAddModal(false);
      setNewMonitor({ name: '', url: '', check_interval_seconds: 60 });
      loadMonitors();
      addToast({ title: 'Monitor created!', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to create monitor', variant: 'error' });
    }
  };

  const handleEditMonitor = async () => {
    if (!editingMonitor) return;
    try {
      await monitorApi.update(editingMonitor.id, editForm);
      setEditingMonitor(null);
      loadMonitors();
      addToast({ title: 'Monitor updated!', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to update monitor', variant: 'error' });
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await monitorApi.delete(id);
      loadMonitors();
      if (selectedMonitor?.id === id) setSelectedMonitor(null);
      addToast({ title: 'Monitor deleted', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to delete monitor', variant: 'error' });
    }
  };

  const handleViewUptime = async (monitor: Monitor) => {
    setUptimeLoading(true);
    try {
      const response = await monitorApi.getUptime(monitor.id, 30);
      setSelectedMonitor(response.data);
    } catch {
      addToast({ title: 'Failed to load uptime data', variant: 'error' });
    } finally {
      setUptimeLoading(false);
    }
  };

  const openEditModal = (monitor: Monitor) => {
    setEditingMonitor(monitor);
    setEditForm({
      name: monitor.name,
      url: monitor.url,
      check_interval_seconds: monitor.check_interval_seconds,
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'operational': return { color: 'bg-emerald-500', label: 'Operational', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'degraded': return { color: 'bg-amber-500', label: 'Degraded', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
      case 'outage': return { color: 'bg-red-500', label: 'Outage', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      default: return { color: 'bg-slate-400', label: status, badge: 'bg-slate-100 text-slate-700' };
    }
  };

  const getBarColor = (pct: number) => {
    if (pct >= 99) return '#10b981';
    if (pct >= 95) return '#f59e0b';
    return '#ef4444';
  };

  const formatInterval = (seconds: number) => {
    if (seconds >= 600) return '10 min';
    if (seconds >= 300) return '5 min';
    return '1 min';
  };

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Monitors</h1>
          <p className="text-slate-500 mt-1">Track the uptime of your services</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Monitor
        </Button>
      </div>

      {/* Monitors List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {monitors.length === 0 ? (
            <div className="p-12 text-center">
              <Wifi className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No monitors yet</h3>
              <p className="text-slate-500 mb-4">Add your first monitor to start tracking uptime.</p>
              <Button onClick={() => setShowAddModal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Monitor
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {monitors.map((monitor) => {
                const statusCfg = getStatusConfig(monitor.status);
                return (
                  <div key={monitor.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleViewUptime(monitor)}
                      >
                        <div className={`w-3 h-3 rounded-full ${statusCfg.color} ${monitor.status === 'operational' ? 'animate-pulse' : ''}`} />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{monitor.name}</p>
                          <p className="text-sm text-slate-400">{monitor.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {formatInterval(monitor.check_interval_seconds)}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewUptime(monitor)} title="View uptime">
                            <BarChart3 className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(monitor)} title="Edit">
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteMonitor(monitor.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {monitor.last_checked_at && (
                      <p className="text-xs text-slate-400 mt-1 ml-6">
                        Last checked: {new Date(monitor.last_checked_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uptime Chart */}
      {uptimeLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-64 rounded-lg" />
          </CardContent>
        </Card>
      )}

      {selectedMonitor && !uptimeLoading && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Uptime — {selectedMonitor.name} (Last 30 Days)
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedMonitor(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {selectedMonitor.uptime_stats.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No uptime data yet. Checks will appear here once the monitor runs.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={selectedMonitor.uptime_stats}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as UptimeStats;
                        return (
                          <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700">
                            <p className="font-semibold text-sm">{data.date}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Uptime: <span className="font-bold">{data.uptime_percentage.toFixed(2)}%</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {data.up_checks}/{data.total_checks} checks passed
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="uptime_percentage" radius={[4, 4, 0, 0]}>
                    {selectedMonitor.uptime_stats.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.uptime_percentage)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Monitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader>
              <CardTitle>Add Monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g. API Server"
                  value={newMonitor.name}
                  onChange={(e) => setNewMonitor({ ...newMonitor, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input
                  placeholder="https://api.example.com/health"
                  value={newMonitor.url}
                  onChange={(e) => setNewMonitor({ ...newMonitor, url: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Check Interval</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newMonitor.check_interval_seconds}
                  onChange={(e) => setNewMonitor({ ...newMonitor, check_interval_seconds: parseInt(e.target.value) })}
                >
                  <option value={60}>Every 1 minute</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={handleAddMonitor}
                >
                  Add Monitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Monitor Modal */}
      {editingMonitor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardHeader>
              <CardTitle>Edit Monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Check Interval</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editForm.check_interval_seconds}
                  onChange={(e) => setEditForm({ ...editForm, check_interval_seconds: parseInt(e.target.value) })}
                >
                  <option value={60}>Every 1 minute</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingMonitor(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  onClick={handleEditMonitor}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
