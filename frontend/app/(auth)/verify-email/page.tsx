'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { Activity, Mail, RefreshCcw } from 'lucide-react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Verification code must be exactly 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authApi.verifyEmail({ email, otp });
      localStorage.setItem('token', response.data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email to resend the code');
      return;
    }
    setResending(true);
    setError('');
    setMessage('');
    
    try {
      await authApi.resendOtp({ email });
      setMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="border border-gray-800 shadow-2xl bg-gray-900/80 backdrop-blur">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center text-gray-100">Verify your email</CardTitle>
        <CardDescription className="text-center text-gray-400">
          We've sent a 6-digit code to <span className="text-gray-200 font-medium">{email || 'your email'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm bg-red-900/30 text-red-400 rounded-lg border border-red-800/50">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 text-sm bg-emerald-900/30 text-emerald-400 rounded-lg border border-emerald-800/50">
              {message}
            </div>
          )}
          {!emailParam && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-950 font-medium tracking-wide"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Verification Code</label>
            <Input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))}
              required
              className="text-center text-2xl tracking-[0.5em] font-mono bg-gray-950 border-emerald-500/30 focus-visible:ring-emerald-500 py-6"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 py-6"
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : 'Verify & Continue'}
          </Button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-4 text-sm text-gray-400">
          <button 
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
          <div className="text-center">
            Back to{' '}
            <Link href="/login" className="text-gray-300 hover:text-white font-medium underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              StatusPage
            </span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="w-full h-96 flex items-center justify-center border border-gray-800 shadow-2xl bg-gray-900/80 backdrop-blur rounded-xl">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
