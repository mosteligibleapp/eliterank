import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

const TOAST_TYPES = {
  success: {
    icon: Check,
    bgClass: 'bg-green-500/15',
    borderClass: 'border-green-500/30',
    iconColor: 'text-green-500',
  },
  error: {
    icon: X,
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/30',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    bgClass: 'bg-yellow-400/15',
    borderClass: 'border-yellow-400/30',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/30',
    iconColor: 'text-blue-500',
  },
};

export function Toast({ id, type = 'success', message, onDismiss, duration = 4000 }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-4 px-4 py-3 border rounded-lg shadow-lg
        min-w-[300px] max-w-[450px]
        ${config.bgClass} ${config.borderClass}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center shrink-0
          ${config.bgClass} border ${config.borderClass}
        `}
      >
        <Icon size={16} className={config.iconColor} />
      </div>
      <p className="flex-1 text-sm text-white m-0">
        {message}
      </p>
      <button
        onClick={handleDismiss}
        className="bg-transparent border-none p-1 cursor-pointer text-gray-500 flex items-center justify-center rounded hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
          .animate-slide-in {
            animation: slideIn 0.3s ease-out;
          }
          .animate-slide-out {
            animation: slideOut 0.3s ease-out forwards;
          }
        `}
      </style>
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

export default Toast;
