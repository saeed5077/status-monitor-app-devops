import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionUnsubscribedPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">Unsubscribed</h1>
        <p className="text-gray-400 mb-8">
          You have successfully unsubscribed. You will no longer receive status notifications.
        </p>
        
        <Link href="/" className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium">
          Return Home
        </Link>
      </div>
    </div>
  );
}
