import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

const styles = {
  success: {
    bar:  'bg-[#AED500]',
    icon: 'text-[#AED500]',
    bg:   'bg-[#0f1a2e] border border-[#AED500]/30',
  },
  error: {
    bar:  'bg-red-500',
    icon: 'text-red-400',
    bg:   'bg-[#0f1a2e] border border-red-500/30',
  },
  warning: {
    bar:  'bg-yellow-400',
    icon: 'text-yellow-400',
    bg:   'bg-[#0f1a2e] border border-yellow-400/30',
  },
  info: {
    bar:  'bg-blue-400',
    icon: 'text-blue-400',
    bg:   'bg-[#0f1a2e] border border-blue-400/30',
  },
};

// ── Single Toast Item ─────────────────────────────────────────────────────────
const ToastItem = ({ id, type = 'info', message, duration = 4000, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(id), 350);
  }, [id, onRemove]);

  useEffect(() => {
    // Slide in
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, duration);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(timerRef.current);
    };
  }, [dismiss, duration]);

  const s = styles[type] || styles.info;

  return (
    <div
      style={{
        transform: visible && !exiting ? 'translateY(0)' : 'translateY(-1rem)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
      }}
      className={`relative flex items-start gap-3 w-full sm:w-80 rounded-xl shadow-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${s.bg} overflow-hidden`}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${s.bar} rounded-full`}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />
      {/* Icon */}
      <span className={`mt-0.5 ${s.icon}`}>{icons[type]}</span>
      {/* Message */}
      <p className="flex-1 text-xs sm:text-sm text-gray-200 leading-snug pr-2">{message}</p>
      {/* Close */}
      <button
        onClick={dismiss}
        className="shrink-0 text-gray-500 hover:text-white transition-colors mt-0.5 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ── Context ───────────────────────────────────────────────────────────────────
export const ToastContext = React.createContext(null);

let _toastCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', time: 0 });

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const now = Date.now();
    // Block duplicate toast messages sent within 800ms
    if (lastToastRef.current.message === message && (now - lastToastRef.current.time) < 800) {
      return;
    }
    lastToastRef.current = { message, time: now };

    const id = ++_toastCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info:    (msg, dur) => addToast(msg, 'info',    dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[9999] flex flex-col gap-2 pointer-events-none items-center sm:items-end w-[calc(100%-2rem)] max-w-md sm:w-auto sm:max-w-none">
          <style>{`
            @keyframes toast-progress {
              from { width: 100%; }
              to   { width: 0%; }
            }
          `}</style>
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto w-full sm:w-auto flex justify-center sm:justify-end">
              <ToastItem {...t} onRemove={removeToast} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};
