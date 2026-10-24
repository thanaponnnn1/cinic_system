import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, GhostLink } from '@/components/ui';
import { bookingHref } from '@/config';
import { content } from '@/content/load';
import { GlowButton } from '@/effects/glow-ring';

export const metadata: Metadata = {
  title: { absolute: 'ไม่พบหน้านี้ | THNP Clinic' },
  robots: { index: false, follow: false },
};

/** หน้า 404: พากลับไปหน้าบริการและปุ่มจอง (แผน §3) ไม่อยู่ใน sitemap */
export default function NotFound() {
  return (
    <section
      aria-labelledby="nf-title"
      className="relative isolate flex min-h-[88svh] items-center overflow-hidden bg-navy-950 pt-28 pb-20 text-gold-100"
    >
      <p
        aria-hidden
        className="text-gold-gradient pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-1/2 font-display text-[42vw] leading-none font-medium tracking-[-0.04em] whitespace-nowrap opacity-[0.07] select-none lg:text-[30vw]"
      >
        404
      </p>
      <Container>
        <p className="text-[13px] font-medium tracking-[0.22em] text-gold-400">404</p>
        <h1
          id="nf-title"
          className="mt-5 max-w-3xl text-5xl leading-[1.2] font-light text-balance sm:text-6xl"
        >
          ไม่พบหน้าที่คุณกำลังหา
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-[1.9] text-gold-100/75">
          ลิงก์อาจเปลี่ยนไปแล้ว ลองเลือกบริการที่สนใจด้านล่าง หรือจองคิวได้ทันที
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <GlowButton href={bookingHref()} size="lg">
            จองคิวออนไลน์
          </GlowButton>
          <GhostLink href="/">กลับหน้าแรก</GhostLink>
        </div>
        <nav aria-label="บริการทั้งหมด" className="mt-14">
          <ul className="flex flex-wrap gap-2.5">
            {content.services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex rounded-full border border-gold-300/25 px-4 py-2 text-[15px] text-gold-100/85 transition-colors hover:border-gold-300 hover:text-gold-100"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
