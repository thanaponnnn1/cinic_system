'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * กล่องซ้อนหน้าจอ
 *
 * ใช้ <dialog> ของ HTML แทนการประกอบ div เอง เพราะเบราว์เซอร์จัดการเรื่องที่พลาดกันบ่อย
 * ให้ครบอยู่แล้ว: กัน focus ไม่ให้หลุดออกไปข้างหลัง ปิดด้วย Esc และซ้อนอยู่บนสุดเสมอ
 * โดยไม่ต้องไล่ตั้ง z-index แข่งกับอย่างอื่น
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // ปุ่ม Esc ของเบราว์เซอร์ปิด dialog เองโดยไม่ผ่าน state ของเรา ต้องรับ event นี้ไว้ซิงก์กลับ
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[min(100vw-2rem,34rem)] rounded-xl border border-navy-600 bg-navy-900 p-0 text-gold-100 backdrop:bg-navy-950/70"
    >
      <header className="border-b border-navy-700/60 px-5 py-4">
        <h2 className="font-display text-lg text-gold-200">{title}</h2>
        {description && <p className="mt-1 text-xs text-gold-300/60">{description}</p>}
      </header>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

      {footer && (
        <footer className="flex justify-end gap-2 border-t border-navy-700/60 px-5 py-4">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
