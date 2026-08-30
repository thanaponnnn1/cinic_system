'use client';

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

/**
 * ชิ้นส่วนหน้าจอพื้นฐาน
 *
 * เขียนเองบน token ของแบรนด์ (navy/gold ที่วัดมาจากโลโก้จริง) แทนการลงชุด component สำเร็จรูป
 * เพราะชุดสำเร็จรูปมาพร้อมธีมกลาง ๆ ที่ต้องรื้อทั้งชุดให้กลายเป็นทองบนกรมท่าอยู่ดี
 * แลกมาด้วยหน้าที่ต้องดูแลเอง: โฟกัสต้องเห็นชัด และปุ่มที่กำลังทำงานต้องกดซ้ำไม่ได้
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_STYLE: Record<ButtonVariant, string> = {
  primary: 'bg-gold-400 text-navy-950 hover:bg-gold-300 disabled:bg-gold-700',
  secondary: 'border border-gold-700 text-gold-200 hover:border-gold-400 hover:text-gold-100',
  ghost: 'text-gold-300/80 hover:bg-navy-800 hover:text-gold-100',
  danger: 'border border-status-noshow/60 text-status-noshow hover:bg-status-noshow/10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizing = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';

  return (
    <button
      {...props}
      // ปุ่มที่กำลังทำงานต้องกดซ้ำไม่ได้ ไม่งั้นการกดรัว ๆ จะกลายเป็นการยิงคำขอซ้ำ
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${BUTTON_STYLE[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag className={`rounded-xl border border-navy-600 bg-navy-900/60 ${className}`}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-700/60 px-5 py-4">
      <div>
        <h2 className="font-display text-lg text-gold-200">{title}</h2>
        {description && <p className="mt-1 text-xs text-gold-300/60">{description}</p>}
      </div>
      {action}
    </header>
  );
}

/** ป้ายสถานะ — สีมาจาก API เสมอ หน้าจอไม่แมปสีเอง ข้อความในแชทกับบนจอจะได้สีเดียวกัน */
export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warn' | 'danger' | 'good';
}) {
  const style = {
    neutral: 'bg-navy-700 text-gold-300/80',
    warn: 'bg-status-booked/15 text-status-booked',
    danger: 'bg-status-noshow/15 text-status-noshow',
    good: 'bg-status-confirmed/15 text-status-confirmed',
  }[tone];

  return <span className={`rounded px-1.5 py-0.5 text-xs ${style}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-gold-300/70">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-gold-300/50">{hint}</span>}
      {error && <span className="block text-xs text-status-noshow">{error}</span>}
    </label>
  );
}

const CONTROL =
  'w-full rounded-md border border-navy-600 bg-navy-950 px-3 py-2 text-sm text-gold-100 placeholder:text-gold-300/30 focus:border-gold-600 focus:ring-1 focus:ring-gold-600 focus:outline-none disabled:opacity-50';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function Textarea({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return <textarea {...props} className={`${CONTROL} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${CONTROL} ${className}`}>
      {children}
    </select>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-navy-700/70 ${className}`} aria-hidden />;
}

/**
 * หน้าจอตอนไม่มีข้อมูล
 *
 * เขียนให้บอกด้วยว่าควรทำอะไรต่อ ไม่ใช่แค่คำว่า "ไม่มีข้อมูล" ลอย ๆ ซึ่งทำให้คนใช้งานจริง
 * ไม่รู้ว่าระบบพังหรือยังไม่มีของ
 */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-gold-300/70">{title}</p>
      {hint && <p className="mt-1 text-xs text-gold-300/45">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="space-y-3 px-5 py-8 text-center">
      <p className="text-sm text-status-noshow">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          ลองอีกครั้ง
        </Button>
      )}
    </div>
  );
}

/** การ์ดตัวเลขใหญ่ของหน้าสรุป */
export function StatTile({
  label,
  value,
  unit,
  note,
  tone = 'gold',
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  tone?: 'gold' | 'good' | 'warn' | 'danger';
}) {
  const color = {
    gold: 'text-gold-200',
    good: 'text-status-confirmed',
    warn: 'text-status-booked',
    danger: 'text-status-noshow',
  }[tone];

  return (
    <Card className="p-5">
      <p className="text-xs tracking-wide text-gold-300/60">{label}</p>
      <p className={`mt-2 font-display text-3xl ${color}`}>
        {value}
        {unit && <span className="ml-1 text-base text-gold-300/50">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-xs text-gold-300/50">{note}</p>}
    </Card>
  );
}
