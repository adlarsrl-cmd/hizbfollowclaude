import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast, ToastType } from '../stores/useToast';

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bgColor: string; iconColor: string; borderColor: string }> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    iconColor: 'text-rose-500',
    borderColor: 'border-rose-500/20'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-500/20'
  },
  info: {
    icon: Info,
    bgColor: 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  }
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${config.bgColor} ${config.borderColor} shadow-xl shadow-black/5 animate-in slide-in-from-right duration-300`}
      role="alert"
    >
      <div className={`p-1 rounded-full ${config.iconColor.replace('text-', 'bg-')}/10`}>
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
      </div>
      <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 pt-0.5">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <div className="pointer-events-auto space-y-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
}
