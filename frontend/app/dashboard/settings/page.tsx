'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tenant } from '@/types';
import { tenantApi, authApi, domainApi } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { CheckCircle, Globe, Copy, ExternalLink, Palette, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { addToast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [domainStatus, setDomainStatus] = useState<{verified: boolean; message: string; dns_records: string[]} | null>(null);
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
    } catch {
      addToast({ title: 'Failed to load settings', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await tenantApi.updateMyTenant(formData);
      setTenant(res.data);
      addToast({ title: 'Settings saved successfully!', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to save settings', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const copyStatusUrl = () => {
    if (tenant) {
      navigator.clipboard.writeText(`${window.location.origin}/status/${tenant.slug}`);
      addToast({ title: 'Status page URL copied!', variant: 'success' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1">Customize your status page branding</p>
      </div>

      {/* Status Page URL */}
      {tenant && (
        <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-950/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Your Public Status Page</p>
                <p className="text-sm text-indigo-600/70 mt-0.5">{window.location.origin}/status/{tenant.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyStatusUrl} className="text-xs">
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy URL
                </Button>
                <Link href={`/status/${tenant.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brand Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Brand Settings</CardTitle>
            </div>
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
              {formData.logo_url && (
                <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <img src={formData.logo_url} alt="Logo preview" className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Brand Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="w-12 h-10 rounded-md border border-input cursor-pointer"
                />
                <Input
                  value={formData.brand_color}
                  onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                  className="flex-1"
                  placeholder="#3B82F6"
                />
                <div
                  className="w-10 h-10 rounded-lg shadow-inner border border-slate-200"
                  style={{ backgroundColor: formData.brand_color }}
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-lg">Custom Domain & TLS</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Domain</label>
              <Input
                placeholder="status.yourdomain.com"
                value={formData.custom_domain}
                onChange={(e) => {
                  setFormData({ ...formData, custom_domain: e.target.value });
                  setDomainStatus(null);
                }}
              />
            </div>

            {/* Domain verification status */}
            {domainStatus && (
              <div className={`p-4 rounded-lg border text-sm ${
                domainStatus.verified
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-start gap-2">
                  {domainStatus.verified
                    ? <Shield className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  }
                  <div>
                    <p className={domainStatus.verified ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400 font-medium'}>
                      {domainStatus.verified ? 'Domain Verified ✓' : 'Verification Failed'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{domainStatus.message}</p>
                    {domainStatus.dns_records.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="font-medium text-xs text-slate-500">DNS records found:</p>
                        {domainStatus.dns_records.map((r, i) => (
                          <code key={i} className="block text-xs bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded">{r}</code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              <p className="font-medium text-sm">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-500">
                <li>Add an <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">A</code> record or <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">CNAME</code> pointing <strong className="text-slate-700 dark:text-slate-300">{formData.custom_domain || 'your domain'}</strong> to our server</li>
                <li>Click <strong className="text-slate-700 dark:text-slate-300">Verify Domain</strong> to confirm DNS is configured</li>
                <li>Once verified, Caddy will auto-provision a TLS certificate via Let&apos;s Encrypt</li>
                <li>Your status page will be accessible at <strong className="text-slate-700 dark:text-slate-300">https://{formData.custom_domain || 'your-domain.com'}</strong></li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} variant="outline" className="flex-1">
                Save Domain
              </Button>
              <Button
                onClick={async () => {
                  if (!formData.custom_domain) {
                    addToast({ title: 'Enter a domain first', variant: 'error' });
                    return;
                  }
                  setVerifying(true);
                  setDomainStatus(null);
                  try {
                    // Save domain first, then verify
                    await tenantApi.updateMyTenant({ custom_domain: formData.custom_domain });
                    const res = await domainApi.verify(formData.custom_domain);
                    setDomainStatus(res.data);
                    if (res.data.verified) {
                      addToast({ title: 'Domain verified! TLS will be provisioned automatically.', variant: 'success' });
                    } else {
                      addToast({ title: 'DNS not pointing to our server yet', variant: 'error' });
                    }
                  } catch {
                    addToast({ title: 'Verification failed', variant: 'error' });
                  } finally {
                    setVerifying(false);
                  }
                }}
                disabled={verifying || !formData.custom_domain}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {verifying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking DNS...
                  </div>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Domain
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="md:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-4 text-xs text-slate-400">
                  {formData.custom_domain || `statuspage.app/status/${tenant?.slug || 'your-company'}`}
                </span>
              </div>

              {/* Preview content */}
              <div className="p-6 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-4 mb-6">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="" className="h-10 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <h2 className="text-xl font-bold" style={{ color: formData.brand_color }}>
                    {formData.name}
                  </h2>
                </div>
                <div
                  className="text-white px-5 py-3.5 rounded-lg mb-5 font-medium text-sm"
                  style={{ backgroundColor: formData.brand_color }}
                >
                  ✓ All Systems Operational
                </div>
                <div className="space-y-2">
                  {['API Server', 'Web Application', 'Database'].map((name) => (
                    <div key={name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className="text-sm font-medium">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-400">Operational</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
