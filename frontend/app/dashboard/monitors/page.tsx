'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor } from '@/types';
import { monitorApi } from '@/lib/api';
import { Plus, Trash2, Edit, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMonitor, setNewMonitor] = useState({ name: '', url: '', check_interval_seconds: 60 });

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await monitorApi.list();
      setMonitors(response.data);
    } catch (error) {
      console.error('Failed to load monitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMonitor = async () => {
    try {
      await monitorApi.create(newMonitor);
      setShowAddModal(false);
      setNewMonitor({ name: '', url: '', check_interval_seconds: 60 });
      loadMonitors();
    } catch (error) {
      console.error('Failed to add monitor:', error);
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await monitorApi.delete(id);
      loadMonitors();
    } catch (error) {
      console.error('Failed to delete monitor:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'outage': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitors</h1>
          <p className="text-muted-foreground">Manage your service monitors</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Monitor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {monitors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No monitors yet. Add your first monitor to start tracking uptime.
            </div>
          ) : (
            <div className="divide-y">
              {monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status)}`} />
                    <div>
                      <p className="font-medium">{monitor.name}</p>
                      <p className="text-sm text-muted-foreground">{monitor.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {monitor.check_interval_seconds}s interval
                    </span>
                    <Link href={`/status/${monitor.tenant_id}`} target="_blank">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMonitor(monitor.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Monitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="API Service"
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
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newMonitor.check_interval_seconds}
                  onChange={(e) => setNewMonitor({ ...newMonitor, check_interval_seconds: parseInt(e.target.value) })}
                >
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddMonitor}>
                  Add Monitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
