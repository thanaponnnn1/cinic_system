'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CUSTOMER_KEYS, customerGet } from '@/lib/customer-api';
import { customerErrorMessage } from '@/lib/customer-errors';
import type { CustomerShop } from '@/lib/customer-types';
import { ProfileButton } from '@/components/customer/profile';
import { PhotoStack } from '@/components/customer/shop/photo-stack';
import { ReviewDeck } from '@/components/customer/shop/review-deck';
import { ServicesCarousel } from '@/components/customer/shop/services-carousel';
import { Stylists } from '@/components/customer/shop/stylists';
import {
  GlowRing,
  PortalCard,
  PortalEmpty,
  PortalError,
  PortalSkeleton,
  SectionTitle,
} from '@/components/customer/ui';

/** ตั้งเมื่อร้านมีบัญชี LINE OA จริง (เช่น https://line.me/R/ti/p/@xxxx) — ไม่ตั้งก็ไม่แสดงปุ่ม */
const LINE_CHAT_URL = process.env.NEXT_PUBLIC_LINE_OA_URL ?? '';

/**
 * หน้าร้าน — หน้าแรกที่ลูกค้าเห็นเมื่อเปิดจากริชเมนู LINE เปิดดูได้โดยไม่ต้องเข้าสู่ระบบ
 *
 * ไม่มีที่อยู่ เบอร์โทร หรือแผนที่ เพราะ API ยังไม่มีข้อมูลเหล่านี้ และหน้าที่เจ้าของร้านจะเห็น
 * ต้องไม่มีรายละเอียดที่แต่งขึ้นเอง ถ้าลูกค้าจะติดต่อร้าน ให้ทักแชท LINE ซึ่งเป็นช่องทางที่ร้านใช้จริง
 */
export default function ShopPage() {
  const shop = useQuery({
    queryKey: CUSTOMER_KEYS.shop,
    queryFn: () => customerGet<CustomerShop>('shop'),
    staleTime: 5 * 60_000,
  });

  if (shop.isPending) return <ShopSkeleton />;
  if (shop.isError) {
    return (
      <div className="pt-24">
        <PortalError
          message={customerErrorMessage(shop.error)}
          onRetry={() => void shop.refetch()}
        />
      </div>
    );
  }

  const { brand, hours, services, providers } = shop.data;

  return (
    <div>
      <Hero name={brand.name} />

      <section className="pt-10">
        <SectionTitle
          eyebrow="Services"
          title="บริการของเรา"
          aside={<span className="text-sm text-navy-400">ปัดดูได้</span>}
        />
        {services.length === 0 ? (
          <PortalEmpty
            title="ร้านยังไม่ได้เปิดบริการให้จองออนไลน์"
            hint="ทักแชทร้านเพื่อสอบถามคิวได้เลย"
          />
        ) : (
          <ServicesCarousel services={services} />
        )}
      </section>

      {providers.length > 0 && (
        <section className="pt-12">
          <SectionTitle eyebrow="Our team" title="ทีมช่าง" />
          <Stylists providers={providers} />
        </section>
      )}

      <section className="pt-12">
        <SectionTitle eyebrow="Atmosphere" title="บรรยากาศในร้าน" />
        <PhotoStack />
      </section>

      <section className="pt-12">
        <SectionTitle
          eyebrow="Reviews"
          title="เสียงจากลูกค้า"
          aside={
            <span className="rounded-full border border-navy-700/15 bg-ivory-100 px-2.5 py-1 text-xs text-navy-700">
              ตัวอย่างเดโม
            </span>
          }
        />
        <ReviewDeck />
      </section>

      <section className="px-5 pt-10">
        <PortalCard className="p-5">
          <h2 className="font-display text-xl text-navy-700">เวลารับจองออนไลน์</h2>
          <p className="mt-3 font-display text-3xl text-navy-700">
            {hours.open}–{hours.close} <span className="font-sans text-base">น.</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-navy-400">
            <li>จองล่วงหน้าอย่างน้อย {leadLabel(hours.minLeadMinutes)}</li>
            <li>จองล่วงหน้าได้ไกลสุด {hours.maxAdvanceDays} วัน</li>
          </ul>

          {LINE_CHAT_URL && (
            <a
              href={LINE_CHAT_URL}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-navy-700/20 bg-white text-[15px] font-medium text-navy-700"
            >
              <ChatIcon />
              ทักแชทร้านใน LINE
            </a>
          )}
        </PortalCard>
      </section>
    </div>
  );
}

function leadLabel(minutes: number): string {
  return minutes % 60 === 0 ? `${minutes / 60} ชั่วโมง` : `${minutes} นาที`;
}

/**
 * รูปหน้าร้านเต็มกว้าง ไล่สีครีมทับครึ่งล่าง — รูปกว้างแค่ 736px ถ้าแสดงเปล่า ๆ บนจอใหญ่
 * จะเห็นความเบลอ ชั้นไล่สีช่วยกลบและทำให้ชื่อร้านสีกรมท่าอ่านออกบนพื้นครีม
 */
function Hero({ name }: { name: string }) {
  return (
    <header className="relative h-[min(92svh,720px)] min-h-[520px] overflow-hidden">
      <img
        src="/demo/hero.webp"
        alt="ล็อบบี้ของร้าน"
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-navy-950/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ivory-50 via-ivory-50/90 to-transparent" />

      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4">
        <ProfileButton tone="overlay" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10 text-center">
        <p className="font-display text-xs tracking-[0.35em] text-navy-700 uppercase">
          Aesthetics &amp; Wellness
        </p>
        <h1 className="mt-2 font-display text-[44px] leading-none text-navy-700">{name}</h1>
        <span aria-hidden className="mt-4 h-px w-12 bg-gold-500" />
        <p className="mt-4 max-w-[18rem] text-[15px] text-navy-700">
          จองคิวเองได้ตลอด 24 ชั่วโมง เห็นเฉพาะเวลาที่ว่างจริง
        </p>
        <GlowRing className="mt-7">
          <Link
            href="/c/book"
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-navy-700 px-12 text-[17px] font-medium text-ivory-50 focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:outline-none focus-visible:ring-inset"
          >
            จองคิว
          </Link>
        </GlowRing>
      </div>
    </header>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none">
      <path
        d="M12 4c4.7 0 8.5 3 8.5 6.8 0 3.7-3.8 6.7-8.5 6.7-.7 0-1.4-.1-2-.2L6 19.5l.8-3.3C4.8 15 3.5 13 3.5 10.8 3.5 7 7.3 4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShopSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดหน้าร้าน">
      <PortalSkeleton className="h-[min(92svh,720px)] min-h-[520px] rounded-none" />
      <div className="space-y-4 px-5 pt-10">
        <PortalSkeleton className="h-6 w-40" />
        <div className="flex gap-3 overflow-hidden">
          <PortalSkeleton className="aspect-[3/4] w-[216px] shrink-0 rounded-[28px]" />
          <PortalSkeleton className="aspect-[3/4] w-[216px] shrink-0 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
