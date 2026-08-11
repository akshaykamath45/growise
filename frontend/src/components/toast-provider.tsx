"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastInput = { title: string; message?: string };
type Toast = ToastInput & { id: number };

const ToastContext = createContext<{ success: (toast: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((toast: ToastInput) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), 4400);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ success }}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-[76px] z-[70] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2.5" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="pointer-events-auto flex gap-3 rounded-xl border border-gw-success/30 bg-gw-surface px-3.5 py-3 shadow-[0_18px_38px_-18px_rgba(25,125,74,0.4)] [animation:toastIn_220ms_ease-out]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gw-success text-[11px] font-bold text-white" aria-hidden>✓</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-gw-ink">{toast.title}</div>
              {toast.message && <div className="mt-0.5 text-[12px] leading-relaxed text-gw-text-muted">{toast.message}</div>}
            </div>
            <button type="button" onClick={() => dismiss(toast.id)} className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-gw-text-placeholder hover:bg-gw-surface-muted hover:text-gw-ink" aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
