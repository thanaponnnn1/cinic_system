import Link from 'next/link';
import type { ReactNode } from 'react';

/** กรอบความกว้างหน้า ปรับความกว้างสูงสุดผ่าน max (ใส่ max-w ใน className จะชนกับค่าปริยาย) */
export function Container({
  children,
  className = '',
  max = 'max-w-[1360px]',
}: {
  children: ReactNode;
  className?: string;
  max?: string;
}) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-12 ${max} ${className}`}>{children}</div>
  );
}

export function Eyebrow({
  children,
  tone = 'gold',
}: {
  children: ReactNode;
  tone?: 'gold' | 'ink';
}) {
  return (
    <p
      className={`flex items-center gap-3 text-[14px] font-medium tracking-[0.06em] uppercase ${
        tone === 'gold' ? 'text-gold-400' : 'text-gold-800'
      }`}
    >
      <span aria-hidden className="h-px w-8 bg-current opacity-70" />
      {children}
    </p>
  );
}

export function GhostLink({
  href,
  children,
  tone = 'light',
}: {
  href: string;
  children: ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[15px] transition-colors ${
        tone === 'light'
          ? 'border-gold-300/40 text-gold-100 hover:border-gold-300 hover:bg-gold-100/5'
          : 'border-navy-700/25 text-navy-700 hover:border-navy-700 hover:bg-navy-700/5'
      }`}
    >
      {children}
      <Arrow />
    </Link>
  );
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`size-4 transition-transform group-hover:translate-x-0.5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${rating} จาก 5 ดาว`}
      className={`tracking-[0.15em] ${className}`}
    >
      {'★'.repeat(rating)}
      <span className="opacity-25">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

/** ป้ายบนรีวิวตัวอย่างทุกชิ้น กฎ §7: รีวิว isSample ต้องมีป้ายนี้บนหน้าเว็บเสมอ */
export function SampleBadge({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${
        tone === 'light' ? 'text-gold-800 border-gold-700/40' : 'border-gold-300/40 text-gold-300'
      }`}
    >
      ตัวอย่าง
    </span>
  );
}

export function priceLabel(price: number): string {
  return price === 0 ? 'ไม่มีค่าใช้จ่าย' : `${price.toLocaleString('th-TH')} บาท`;
}

export function durationLabel(minutes: number): string {
  return minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} ชั่วโมง`
    : minutes > 60
      ? `${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`
      : `${minutes} นาที`;
}

/**
 * คำทับศัพท์ที่ตัวตัดบรรทัดภาษาไทยของเบราว์เซอร์ไม่รู้จัก มันจะหักกลางคำ เช่น "ทรีต|เมนต์"
 * หัวข้อตัวใหญ่ที่มีคำพวกนี้ห่อด้วย KeepWords ให้คำนั้นไม่ถูกหัก
 */
const UNBREAKABLE = /(ทรีตเมนต์|คลินิก)/;

export function KeepWords({ text }: { text: string }) {
  return text.split(UNBREAKABLE).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
