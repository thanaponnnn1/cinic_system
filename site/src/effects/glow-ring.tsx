import type { ReactNode } from 'react';
import { Arrow } from '@/components/ui';

/**
 * (9) ปุ่มหลักวงแหวนทองหมุน ใช้กับปุ่มจองเท่านั้น ให้เป็นปุ่มเดียวที่เด่นที่สุดในจอ
 * วงแหวนคือชั้นไล่สี conic ที่หมุนด้วย transform (ดู .glow-ring ใน globals.css)
 * เครื่องที่ตั้งลดการเคลื่อนไหวเห็นวงแหวนนิ่ง
 */
export function GlowButton({
  href,
  children,
  size = 'md',
}: {
  href: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <a href={href} className="glow-ring group inline-flex shrink-0 focus-visible:outline-offset-4">
      <span
        className={`inline-flex items-center gap-3 rounded-full bg-navy-950 font-medium text-gold-100 transition-colors group-hover:bg-navy-900 ${
          size === 'lg' ? 'px-9 py-4 text-lg' : 'px-7 py-3 text-[15px]'
        }`}
      >
        {children}
        <Arrow />
      </span>
    </a>
  );
}
