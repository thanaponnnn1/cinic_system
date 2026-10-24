'use client';

import { MotionConfig } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { liffConfigured, loadLiff } from '@/lib/liff';
import { ProfileProvider } from './profile';
import { Splash } from './splash';
import { TabBar } from './tab-bar';

/**
 * โครงของทุกหน้าลูกค้า
 *
 * บนเดสก์ท็อปวางเป็นคอลัมน์กว้างเท่ามือถือกลางจอ เดโมบนโน้ตบุ๊กจึงดูเป็นแอป ไม่ใช่เว็บที่ยืดเต็มจอ
 * MotionConfig reducedMotion="user" ปิดการขยับทุกชิ้นเมื่อเครื่องตั้งลดการเคลื่อนไหว แต่ยังคงเนื้อหาไว้
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // หน้า welcome ยังไม่รู้ว่าเป็นใคร แท็บนัดกับคอร์สกดไปก็วนกลับมาที่เดิม
  const showTabs = !pathname.startsWith('/c/welcome');

  useEffect(() => {
    // ลิงก์ LIFF แบบมี path (เช่น liff.line.me/<id>/book) เปิดหน้า endpoint ก่อนแล้วให้ liff.init
    // พาไปหน้าปลายทาง จึงต้อง init ทุกหน้าที่เปิดเข้ามา ไม่ใช่แค่ตอนเข้าสู่ระบบ
    if (liffConfigured) loadLiff().catch(() => {});
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <ProfileProvider>
        <div data-portal="customer" className="min-h-dvh bg-ivory-100 text-navy-700">
          <div
            className={`relative mx-auto min-h-dvh max-w-[430px] overflow-x-clip bg-ivory-50 md:shadow-[0_0_60px_-20px_rgb(20_33_50/0.25)] ${
              showTabs ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''
            }`}
          >
            {children}
          </div>
          {showTabs && <TabBar />}
        </div>
        <Splash />
      </ProfileProvider>
    </MotionConfig>
  );
}
