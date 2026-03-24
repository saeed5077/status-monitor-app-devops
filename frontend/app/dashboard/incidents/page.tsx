'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Incident } from '@/types';
import { incidentApi } from '@/lib/api';
import { Plus, Trash2, CheckCircle } from 'lucide-react';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    message: '',
    severity: 'minor',
    status: 'investigating'
  });

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const response = await incidentApi.list();
      setIncidents(response.data);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await incidentApi.update(id, { status: 'resolved' });
      loadIncidents();
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    }
  };

  const handleAddIncident = async () => {
    try {
      await incidentApi.create(newIncident);
      setShowAddModal(false);
      setNewIncident({ title: '', message: '', severity: 'minor', status: 'investigating' });
      loadIncidents();
    } catch (error) {
      console.error('Failed to add incident:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'major': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
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
          <h1 className="text-3xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Manage service incidents</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {incidents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No incidents reported. Your services are running smoothly!
            </div>
          ) : (
            <div className="divide-y">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${getSeverityColor(incident.severity)}`} />
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        {incident.message && (
                          <p className="text-sm text-muted-foreground mt-1">{incident.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            incident.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {incident.status}
                          </span>
                          <span>{incident.severity}</span>
                          {incident.duration_minutes && (
                            <span>({Math.round(incident.duration_minutes)} min)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {incident.status !== 'resolved' && (
                      <Button size="sm" variant="outline" onClick={() => handleResolve(incident.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Report Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Service experiencing issues"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Input
                  placeholder="Additional details..."
                  value={newIncident.message}
                  onChange={(e) => setNewIncident({ ...newIncident, message: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                >
                  <option value="minor">Minor</option>
                  <option value="major">Major</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddIncident}>
                  Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
