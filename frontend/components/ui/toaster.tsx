'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              p-4 rounded-lg shadow-2xl border backdrop-blur-xl
              animate-in slide-in-from-right-full duration-300
              ${toast.variant === 'error'
                ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800'
                : toast.variant === 'success'
                  ? 'bg-green-50 dark:bg-green-950/90 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className={`font-semibold text-sm ${
                  toast.variant === 'error' ? 'text-red-700 dark:text-red-400' :
                  toast.variant === 'success' ? 'text-green-700 dark:text-green-400' :
                  'text-slate-900 dark:text-white'
                }`}>
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
