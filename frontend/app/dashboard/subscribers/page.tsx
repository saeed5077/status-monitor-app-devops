'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Subscriber } from '@/types';
import { subscriberApi } from '@/lib/api';
import { useToast } from '@/components/ui/toaster';
import { Users, CheckCircle, Clock, Mail } from 'lucide-react';

export default function SubscribersPage() {
  const { addToast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      const response = await subscriberApi.list();
      setSubscribers(response.data);
    } catch {
      addToast({ title: 'Failed to load subscribers', variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const confirmed = subscribers.filter(s => s.confirmed).length;
  const pending = subscribers.filter(s => !s.confirmed).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Subscribers</h1>
        <p className="text-slate-500 mt-1">People subscribed to your status updates</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-950/30">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-indigo-600">{subscribers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Confirmed</p>
              <p className="text-2xl font-bold text-emerald-600">{confirmed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriber List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">All Subscribers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {subscribers.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No subscribers yet</h3>
              <p className="text-slate-500">Share your status page to get email subscribers.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {subscribers.map((subscriber) => (
                <div key={subscriber.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {subscriber.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{subscriber.email}</p>
                      <p className="text-xs text-slate-400">
                        Subscribed {new Date(subscriber.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    subscriber.confirmed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {subscriber.confirmed ? 'Confirmed' : 'Pending'}
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
