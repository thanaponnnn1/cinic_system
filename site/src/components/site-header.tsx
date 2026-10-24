import Link from 'next/link';
import { bookingHref } from '@/config';
import { Container } from './ui';

export const NAV = [
  { href: '/services', label: 'บริการ' },
  { href: '/courses', label: 'คอร์สและราคา' },
  { href: '/team', label: 'ทีมช่าง' },
  { href: '/gallery', label: 'แกลเลอรี' },
  { href: '/reviews', label: 'รีวิว' },
  { href: '/articles', label: 'บทความ' },
  { href: '/contact', label: 'ติดต่อ' },
] as const;

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-gold-gradient font-display text-[26px] leading-none font-medium tracking-[0.06em]">
        THNP
      </span>
      <span className="text-[11px] font-medium tracking-[0.42em] text-gold-300">CLINIC</span>
    </span>
  );
}

/**
 * หัวเว็บลอยบนสุด พื้นหลังทึบขึ้นเมื่อเลื่อน (CSS scroll timeline ไม่ใช้ JavaScript)
 * เมนูมือถือใช้ popover ของเบราว์เซอร์ เปิดปิดได้โดยไม่ต้องโหลดสคริปต์
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        aria-hidden
        className="header-bg absolute inset-0 border-b border-gold-300/10 bg-navy-950/92"
      />
      <Container className="relative flex h-[72px] items-center justify-between gap-6">
        <Link href="/" aria-label="THNP Clinic หน้าแรก" className="rounded-md">
          <Wordmark />
        </Link>

        <nav aria-label="เมนูหลัก" className="hidden lg:block">
          <ul className="flex items-center gap-1 xl:gap-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-3 py-2 text-[15px] text-gold-100/80 transition-colors hover:text-gold-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={bookingHref()}
            className="hidden rounded-full bg-gold-300 px-5 py-2.5 text-[15px] font-medium text-navy-950 transition-colors hover:bg-gold-200 sm:inline-flex"
          >
            จองคิวออนไลน์
          </a>
          <button
            type="button"
            popoverTarget="mobile-menu"
            aria-label="เปิดเมนู"
            className="grid size-11 place-items-center rounded-full border border-gold-300/30 text-gold-100 lg:hidden"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 8h16M4 16h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </Container>

      <div
        id="mobile-menu"
        popover="auto"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-navy-950 p-0 text-gold-100 backdrop:bg-navy-950/60"
      >
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <button
            type="button"
            popoverTarget="mobile-menu"
            popoverTargetAction="hide"
            aria-label="ปิดเมนู"
            className="grid size-11 place-items-center rounded-full border border-gold-300/30"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav aria-label="เมนูมือถือ" className="px-6 pt-6">
          <ul className="space-y-1">
            {[{ href: '/', label: 'หน้าแรก' }, ...NAV].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block border-b border-gold-300/10 py-4 text-2xl font-light"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={bookingHref()}
            className="mt-8 flex justify-center rounded-full bg-gold-300 px-6 py-4 text-lg font-medium text-navy-950"
          >
            จองคิวออนไลน์
          </a>
        </nav>
      </div>
    </header>
  );
}

/** ปุ่มจองลอยบนมือถือทุกหน้า ซ่อนบนจอใหญ่ที่มีปุ่มในหัวเว็บอยู่แล้ว */
export function FloatingBook({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="glow-ring fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex lg:hidden"
    >
      <span className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-950 py-3.5 text-[16px] font-medium text-gold-100">
        จองคิวออนไลน์
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  );
}
