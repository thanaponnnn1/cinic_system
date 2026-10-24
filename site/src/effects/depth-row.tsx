import type { ReactNode } from 'react';

/**
 * carousel ปัดนิ้วแบบมีมิติ: การ์ดกลางเต็มขนาด การ์ดข้าง ๆ เล็กลงและจางลง
 *
 * ใช้การเลื่อนของเบราว์เซอร์เอง (scroll-snap) นิ้วจึงลื่นเท่าการเลื่อนปกติ
 * มิติคิดด้วย CSS view(inline) timeline ขยับแค่ scale กับ opacity ไม่มี JavaScript
 * เบราว์เซอร์ที่ไม่รองรับได้ carousel ธรรมดาที่ปัดได้เหมือนเดิม
 */
export function DepthRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul
      aria-label={label}
      className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(1rem,calc(50%-9.5rem))] py-4"
    >
      {children}
    </ul>
  );
}

export function DepthItem({ children }: { children: ReactNode }) {
  return <li className="depth-card w-[19rem] max-w-[78vw] shrink-0 snap-center">{children}</li>;
}
