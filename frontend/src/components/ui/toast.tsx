'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * ข้อความแจ้งผลมุมจอ
 *
 * ทุกการกดปุ่มที่เปลี่ยนข้อมูลต้องมีคำตอบกลับเสมอ ไม่ว่าจะสำเร็จหรือไม่ — หน้าจอที่เงียบ
 * หลังกดปุ่มทำให้พนักงานกดซ้ำ ซึ่งกับระบบนัดหมายแปลว่าข้อความถูกส่งซ้ำหรือคิวถูกจองสองใบ
 */
type Tone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<((tone: Tone, message: string) => void) | null>(null);

const TONE_STYLE: Record<Tone, string> = {
  success: 'border-status-confirmed/50 text-status-confirmed',
  error: 'border-status-noshow/50 text-status-noshow',
  info: 'border-gold-700 text-gold-200',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // aria-live ทำให้โปรแกรมอ่านหน้าจออ่านข้อความนี้ให้ฟังโดยที่โฟกัสไม่ถูกดึงออกจากงานที่ทำอยู่
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-md rounded-lg border bg-navy-900 px-4 py-2.5 text-sm shadow-lg ${TONE_STYLE[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast ต้องอยู่ภายใต้ ToastProvider');

  return useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  );
}
