'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface Tab {
  href: string;
  label: string;
  icon: ReactNode;
  /** หน้าร้านต้องตรงเป๊ะ ไม่งั้น /c จะติดเป็นแท็บที่เลือกในทุกหน้า */
  exact?: boolean;
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const TABS: Tab[] = [
  {
    href: '/c',
    label: 'หน้าร้าน',
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6">
        <path
          d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"
          {...stroke}
        />
      </svg>
    ),
  },
  {
    href: '/c/book',
    label: 'จองคิว',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6">
        <rect x="4" y="5.5" width="16" height="14.5" rx="2" {...stroke} />
        <path d="M8 3.5v4M16 3.5v4M4 10h16M12 13v4M10 15h4" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/c/appointments',
    label: 'นัดของฉัน',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6">
        <circle cx="12" cy="12" r="8" {...stroke} />
        <path d="M12 7.5V12l3 2" {...stroke} />
      </svg>
    ),
  },
  {
    href: '/c/courses',
    label: 'คอร์ส',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-6">
        <path d="M12 4a8 8 0 1 1-8 8" {...stroke} />
        <path d="M12 8a4 4 0 1 1-4 4" {...stroke} />
      </svg>
    ),
  },
];

/**
 * แถบเมนูล่าง 4 แท็บ — ทำให้ความรู้สึกเหมือนแอป ไม่ใช่เว็บที่ต้องหาเมนู
 * พื้นทึบไม่ใช้ backdrop-blur เพราะการเบลอชั้นที่ค้างอยู่ระหว่างเลื่อนหน้าทำให้ Android รุ่นล่างกระตุก
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-ivory-200 bg-ivory-50 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none focus-visible:ring-inset ${
                  active ? 'font-medium text-navy-700' : 'text-navy-400'
                }`}
              >
                <span className="relative grid h-8 w-14 place-items-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-full border border-gold-500/60 bg-gold-200/45"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{tab.icon}</span>
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
