'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from '@/components/ui/primitives';

/**
 * ชิ้นส่วนหน้าจอของฝั่งลูกค้า — โทนงาช้าง ตัวอักษร navy ทองเป็นแค่สีเน้น
 *
 * ตัวอักษรเล็กทุกตัวใช้ navy-700 หรือ navy-400 เท่านั้น ทองบนพื้นครีมได้ความต่างสีแค่ราว 3:1
 * ซึ่งอ่านไม่ออกกลางแดดหน้าร้าน ทองจึงใช้กับเส้นขอบ ไอคอน และหัวข้อตัวใหญ่
 */

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-navy-700 text-ivory-50 hover:bg-navy-600 active:bg-navy-800',
  outline: 'border border-navy-700/20 bg-white text-navy-700 hover:border-navy-700/40',
  ghost: 'text-navy-700 hover:bg-ivory-200',
  danger: 'border border-red-700/30 bg-white text-red-700 hover:bg-red-50',
};

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

interface PortalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function PortalButton({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: PortalButtonProps) {
  return (
    <button
      {...props}
      // กดซ้ำระหว่างรอไม่ได้ — การแตะสองทีในมือถือคือการจองซ้ำ
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${BASE} ${VARIANT[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function PortalLinkButton({
  href,
  variant = 'primary',
  className = '',
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANT[variant]} ${className}`}>
      {children}
    </Link>
  );
}

/**
 * ปุ่มหลักหนึ่งเดียวของหน้า ล้อมด้วยวงแหวนทองที่หมุนช้า ๆ (.glow-ring ใน globals.css)
 * ใช้ได้ทีละปุ่มต่อหน้าเท่านั้น ถ้าทุกปุ่มเรืองแสง ก็ไม่มีปุ่มไหนเด่น
 */
export function GlowRing({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glow-ring ${className}`}>{children}</div>;
}

export function PortalCard({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={`rounded-2xl border border-ivory-200 bg-white shadow-[0_1px_2px_rgb(20_33_50/0.04),0_8px_24px_-12px_rgb(20_33_50/0.12)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function PortalSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-ivory-200 motion-reduce:animate-none ${className}`}
    />
  );
}

export function PortalEmpty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span aria-hidden className="mb-3 h-px w-10 bg-gold-500" />
      <p className="text-[15px] font-medium text-navy-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-navy-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PortalError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <p className="text-sm text-red-700">{message}</p>
      {onRetry && (
        <PortalButton variant="outline" onClick={onRetry}>
          ลองอีกครั้ง
        </PortalButton>
      )}
    </div>
  );
}

/** ข้อความแจ้งในหน้า (แทน alert ของเบราว์เซอร์ที่อัดคลิปแล้วดูไม่เป็นแอป) */
export function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'warn' | 'info';
  children: ReactNode;
}) {
  const style = {
    error: 'border-red-700/25 bg-red-50 text-red-800',
    warn: 'border-amber-700/25 bg-amber-50 text-amber-900',
    info: 'border-navy-700/10 bg-ivory-100 text-navy-700',
  }[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${style}`}
    >
      {children}
    </div>
  );
}

/**
 * ป้ายสถานะนัด — จุดสีใช้ statusColor จาก API (สีเดียวกับบอร์ดคิวและข้อความ LINE)
 * แต่ตัวอักษรเป็น navy เพราะสีสถานะหลายสีบนพื้นครีมจางจนอ่านไม่ออก (เหลืองได้แค่ 1.9:1)
 */
export function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-navy-700"
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}66` }}
    >
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function SectionTitle({
  title,
  eyebrow,
  aside,
}: {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 px-5">
      <div>
        {eyebrow && (
          <p className="font-display text-xs tracking-[0.2em] text-navy-400 uppercase">{eyebrow}</p>
        )}
        <h2 className="font-display text-[22px] leading-tight text-navy-700">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/** หัวข้อของแต่ละขั้นในหน้าจอง */
export function StepHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 px-5">
      <h2 className="font-display text-2xl text-navy-700">{title}</h2>
      {hint && <p className="mt-1 text-sm text-navy-400">{hint}</p>}
    </div>
  );
}
