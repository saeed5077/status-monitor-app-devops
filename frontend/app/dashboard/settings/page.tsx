'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tenant } from '@/types';
import { tenantApi, authApi } from '@/lib/api';
import { CheckCircle, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    brand_color: '#3B82F6',
    custom_domain: ''
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      const userRes = await authApi.getMe();
      const tenantData = userRes.data.tenant;
      setTenant(tenantData);
      setFormData({
        name: tenantData.name,
        logo_url: tenantData.logo_url || '',
        brand_color: tenantData.brand_color,
        custom_domain: tenantData.custom_domain || ''
      });
    } catch (error) {
      console.error('Failed to load tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await tenantApi.updateMyTenant(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your status page</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brand Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Logo URL</label>
              <Input
                placeholder="https://yourdomain.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Brand Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="w-16"
                />
                <Input
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : saved ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Saved</>
              ) : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Domain</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="status.yourdomain.com"
                  value={formData.custom_domain}
                  onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                />
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Add a CNAME record pointing your domain to our servers</li>
                <li>Point {formData.custom_domain || 'your domain'} to our server IP</li>
                <li>SSL certificate will be automatically provisioned</li>
              </ol>
            </div>
            <Button onClick={handleSave} disabled={saving} variant="outline" className="w-full">
              Update Domain
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-6"
              style={{ '--brand-color': formData.brand_color } as React.CSSProperties}
            >
              <div className="flex items-center gap-4 mb-6">
                {formData.logo_url && (
                  <img src={formData.logo_url} alt="Logo" className="h-12 w-auto" />
                )}
                <h2 className="text-2xl font-bold" style={{ color: formData.brand_color }}>
                  {formData.name}
                </h2>
              </div>
              <div className="bg-green-500 text-white px-4 py-3 rounded-lg mb-4">
                All Systems Operational
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span>API</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">99.9% uptime</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded">
                  <span>Website</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">100% uptime</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
