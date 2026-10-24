import type { ReactNode } from 'react';

/**
 * Ken Burns ช้า ๆ (24 วินาทีต่อรอบ) ขยับแค่ transform พร้อมเกรนฟิล์มนิ่งทับ
 * ขยายสูงสุด 1.1 เท่า กรอบที่ใช้ต้องเล็กพอให้รูปยังไม่เกิน 1.3 เท่าของความกว้างไฟล์
 */
export function KenBurnsFrame({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grain overflow-hidden ${className}`}>
      <div className="ken-burns absolute inset-0">{children}</div>
    </div>
  );
}
