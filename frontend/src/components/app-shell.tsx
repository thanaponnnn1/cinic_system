'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { BRAND_INFO, Role } from '@clinicq/shared';
import { apiGet, apiPost } from '@/lib/api';
import type { AuthUser, DemoClock } from '@/lib/api-types';
import { timeOf, thaiDateOf } from '@/lib/format';
import { Button, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

interface NavItem {
  href: string;
  label: string;
  /** ไม่ระบุ = ทุกสิทธิ์เข้าได้ */
  roles?: Role[];
}

/**
 * เมนูหลัก เรียงตามลำดับที่คนหน้าร้านใช้จริงในหนึ่งวัน
 *
 * คิววันนี้อยู่บนสุดเพราะเป็นหน้าที่เปิดค้างไว้ทั้งวัน ส่วนหน้าที่เปิดสัปดาห์ละครั้ง
 * (คอร์ส แคมเปญ ข้อความ) อยู่ล่างสุด
 */
const NAV: NavItem[] = [
  { href: '/', label: 'คิววันนี้' },
  { href: '/calendar', label: 'ปฏิทินนัด' },
  { href: '/customers', label: 'ลูกค้า' },
  { href: '/campaigns', label: 'ดึงลูกค้ากลับ' },
  { href: '/courses', label: 'คอร์ส' },
  { href: '/summary', label: 'สรุปรายวัน' },
  // หน้านี้ผูกกับชื่อลูกค้าเป็นรายคน backend จึงปิดไม่ให้ VIEWER เรียก — ซ่อนเมนูให้ตรงกัน
  { href: '/messages', label: 'ข้อความที่ส่ง', roles: [Role.ADMIN, Role.STAFF] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<AuthUser>('auth/me'),
    staleTime: 5 * 60_000,
  });

  const visible = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-navy-700/60 bg-navy-900/40 lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Image
            src="/brand/logo.jpg"
            alt=""
            width={40}
            height={22}
            className="rounded border border-navy-600"
          />
          <div>
            <p className="text-gold-gradient font-display text-sm">{BRAND_INFO.productName}</p>
            <p className="text-[10px] tracking-[0.15em] text-gold-500 uppercase">
              {BRAND_INFO.name}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {visible.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <div className="px-3 pb-4">
          <DemoPanel />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-navy-700/60 px-4 py-3 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto lg:hidden">
            {visible.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} compact />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              user && (
                <span className="text-right text-xs leading-tight">
                  <span className="block text-gold-200">{user.name}</span>
                  <span className="block text-gold-300/50">{user.roleLabel}</span>
                </span>
              )
            )}
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  compact = false,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const base = compact
    ? 'whitespace-nowrap rounded-md px-3 py-1.5 text-xs'
    : 'block rounded-md px-3 py-2 text-sm';

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`${base} transition ${
        active
          ? 'bg-navy-700 text-gold-100'
          : 'text-gold-300/70 hover:bg-navy-800 hover:text-gold-100'
      }`}
    >
      {item.label}
    </Link>
  );
}

/** '/' ตรงตัวเท่านั้น ส่วนหน้าอื่นถือว่าอยู่ในเมนูนั้นเมื่อ path ขึ้นต้นตรงกัน */
function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" loading={pending} onClick={() => void logout()}>
      ออกจากระบบ
    </Button>
  );
}

/**
 * แผงควบคุมเดโม
 *
 * โผล่เฉพาะตอน DEMO_MODE เปิดอยู่เท่านั้น — ปุ่มข้ามเวลาคือหัวใจของการเดโมสด เพราะทำให้
 * ข้อความเตือนล่วงหน้า 1 วันยิงออกให้ดูได้ทันทีโดยไม่ต้องรอข้ามวันจริง
 */
function DemoPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: clock } = useQuery({
    queryKey: ['demo', 'clock'],
    queryFn: () => apiGet<DemoClock>('demo/clock'),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: (minutes: number) => apiPost<unknown>('demo/advance-time', { minutes }),
    onSuccess: () => {
      toast.success('ข้ามเวลาแล้ว — งานที่ถึงกำหนดจะถูกยิงทันที');
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /**
   * กลับมาเดินตามเวลาจริง
   *
   * จำเป็นตอนไล่ทดสอบด้วยมือหลายรอบ เพราะการข้ามเวลาค้างไว้ทำให้รอบถัดไปเริ่มจากอนาคต
   * แล้วผลที่เห็นจะอธิบายไม่ได้ว่ามาจากของที่เพิ่งทำหรือจากเวลาที่ค้างอยู่
   */
  const reset = useMutation({
    mutationFn: () => apiPost<unknown>('demo/reset-clock'),
    onSuccess: () => {
      toast.success('กลับมาเดินตามเวลาจริงแล้ว');
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const digest = useMutation({
    mutationFn: () => apiPost<{ sent: boolean }>('demo/send-digest'),
    onSuccess: (result) =>
      result.sent
        ? toast.success('ส่งสรุปปิดร้านเข้า LINE แล้ว')
        : toast.info('ยังไม่ได้ตั้ง LINE_ADMIN_USER_ID จึงไม่มีใครได้รับ'),
    onError: (error: Error) => toast.error(error.message),
  });

  if (!clock?.demoMode) return null;

  return (
    <div className="space-y-2 rounded-lg border border-navy-600 bg-navy-950/60 p-3">
      <p className="text-[10px] tracking-[0.15em] text-gold-500 uppercase">โหมดเดโม</p>
      <p className="text-xs text-gold-300/70">
        {thaiDateOf(clock.now)} · {timeOf(clock.now)} น.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" loading={advance.isPending} onClick={() => advance.mutate(24 * 60)}>
          ข้าม 1 วัน
        </Button>
        <Button size="sm" loading={advance.isPending} onClick={() => advance.mutate(120)}>
          ข้าม 2 ชม.
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        loading={digest.isPending}
        onClick={() => digest.mutate()}
        className="w-full"
      >
        ส่งสรุปปิดร้าน
      </Button>

      {clock.offsetMs > 0 && (
        <Button
          size="sm"
          variant="ghost"
          loading={reset.isPending}
          onClick={() => reset.mutate()}
          className="w-full"
        >
          กลับมาเวลาจริง (ข้ามไปแล้ว {Math.round(clock.offsetMs / 3_600_000)} ชม.)
        </Button>
      )}
    </div>
  );
}
