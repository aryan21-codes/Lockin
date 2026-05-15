import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: {
    bg: 'bg-emerald-500/[0.08]',
    border: 'border-emerald-500/[0.2]',
    icon: 'text-emerald-400',
    bar: 'bg-emerald-400',
  },
  error: {
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/[0.2]',
    icon: 'text-red-400',
    bar: 'bg-red-400',
  },
  info: {
    bg: 'bg-primary/[0.08]',
    border: 'border-primary/[0.2]',
    icon: 'text-primary',
    bar: 'bg-primary',
  },
};

const Toast = ({ toast, onDismiss }) => {
  const Icon = icons[toast.type] || icons.info;
  const color = colors[toast.type] || colors.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative w-[360px] overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl shadow-black/30 ${color.bg} ${color.border}`}
    >
      <div className="flex items-start gap-3 p-4">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        >
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color.icon}`} />
        </motion.div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-[13px] font-semibold text-white leading-tight">{toast.title}</p>
          )}
          <p className="text-[12px] text-gray-400 leading-relaxed mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-1 rounded-md hover:bg-white/[0.06] text-gray-600 hover:text-gray-300 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-[2px] ${color.bar}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: toast.duration / 1000 || 4, ease: 'linear' }}
      />
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (message, title) => addToast({ type: 'success', title, message }),
    error: (message, title) => addToast({ type: 'error', title, message }),
    info: (message, title) => addToast({ type: 'info', title, message }),
  }, [addToast]);

  // Fix: useCallback doesn't work directly with object - use useMemo pattern
  const toastMethods = React.useMemo(() => ({
    success: (message, title) => addToast({ type: 'success', title, message }),
    error: (message, title) => addToast({ type: 'error', title, message }),
    info: (message, title) => addToast({ type: 'info', title, message }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default Toast;
