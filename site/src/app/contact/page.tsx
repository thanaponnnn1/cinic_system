import type { Metadata } from 'next';
import Link from 'next/link';
import { MapEmbed } from '@/components/map-embed';
import { Photo } from '@/components/photo';
import { Breadcrumbs } from '@/components/page-chrome';
import { Arrow, Container, Eyebrow, SampleBadge } from '@/components/ui';
import { bookingHref } from '@/config';
import { content, isDemo } from '@/content/load';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.contact, '/contact');

const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

const ROUTE = [
  { title: 'เลือกบริการ', body: 'กดบริการที่สนใจด้านล่าง หน้าจองจะเลือกไว้ให้แล้ว' },
  { title: 'เลือกช่างและเวลา', body: 'เห็นเฉพาะเวลาที่ว่างจริง เลือกช่างคนเดิมได้ทุกครั้ง' },
  { title: 'รับข้อความยืนยัน', body: 'ได้ข้อความยืนยันทาง LINE และข้อความเตือนก่อนนัดหนึ่งวัน' },
];

export default function ContactPage() {
  const { site, services, images } = content;
  const a = site.address;
  const fullAddress = `${a.street} ${a.subdistrict} ${a.district} ${a.province} ${a.postalCode}`;

  return (
    <>
      <section
        aria-labelledby="contact-title"
        className="relative isolate overflow-hidden bg-navy-950 pt-28 pb-20 text-gold-100 lg:pt-36 lg:pb-28"
      >
        <GlBackdrop preset="mesh-drift" className="-z-10" />
        <Container className="relative">
          <Breadcrumbs crumbs={[{ name: 'ติดต่อ', path: '/contact' }]} />
          <h1
            id="contact-title"
            className="mt-6 max-w-4xl text-5xl leading-[1.15] font-light text-balance sm:text-6xl lg:text-[5.5rem]"
          >
            แวะมาพัก<span className="text-gold-gradient">กับเรา</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gold-100/75">
            {site.name} ใจกลางเมือง{site.province} เปิดทุกวัน {site.hours.open} ถึง{' '}
            {site.hours.close} น. จองล่วงหน้าทาง LINE หรือโทรหาเราได้เลย
          </p>

          <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div className="grain relative mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded-[32px] bg-navy-800 sm:aspect-[4/5] lg:sticky lg:top-28 lg:mx-0 lg:max-w-none lg:self-start">
              <Photo
                image={images['space-counter']}
                sizes="(min-width: 1024px) 480px, 92vw"
                className="scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-[3] p-7">
                <p className="font-display text-sm tracking-[0.3em] text-gold-300">THNP CLINIC</p>
                <p className="mt-2 text-2xl font-light">เคาน์เตอร์ต้อนรับและมุมพักรอ</p>
              </div>
            </div>

            <div className="flex flex-col gap-10">
              <address className="grid gap-px overflow-hidden rounded-[28px] border border-gold-300/15 bg-gold-300/10 not-italic sm:grid-cols-2">
                <InfoCell label="ที่อยู่" wide>
                  <span className="block text-xl leading-relaxed font-light">{fullAddress}</span>
                  {isDemo && (
                    <span className="mt-2 flex items-center gap-2 text-xs text-gold-100/55">
                      <SampleBadge tone="dark" /> ที่อยู่สมมติสำหรับเว็บเดโม
                    </span>
                  )}
                </InfoCell>
                <InfoCell label="โทร">
                  <a
                    href={`tel:${site.phone.replace(/-/g, '')}`}
                    className="font-display text-3xl text-gold-200 hover:text-gold-100"
                  >
                    {site.phone}
                  </a>
                </InfoCell>
                <InfoCell label="LINE">
                  <LineButton url={site.lineUrl} demo={isDemo} />
                </InfoCell>
                <InfoCell label="เวลาเปิด" wide>
                  <table className="w-full text-[15px]">
                    <caption className="sr-only">เวลาเปิดทำการแต่ละวัน</caption>
                    <tbody>
                      {DAYS.map((day) => (
                        <tr key={day} className="border-b border-gold-300/10 last:border-0">
                          <th scope="row" className="py-2 text-left font-normal text-gold-100/70">
                            {day}
                          </th>
                          <td className="py-2 text-right tabular-nums">
                            {site.hours.open} ถึง {site.hours.close} น.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </InfoCell>
              </address>

              <MapEmbed
                lat={site.geo.lat}
                lng={site.geo.lng}
                label={fullAddress}
                note={
                  isDemo ? 'หมุดแสดงตำแหน่งตัวอย่างกลางเมือง ไม่ใช่ที่ตั้งจริงของร้าน' : undefined
                }
              />
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="route-title" className="bg-ivory-50 py-20 lg:py-28">
        <Container className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Eyebrow tone="ink">จองคิวออนไลน์</Eyebrow>
            <h2
              id="route-title"
              className="mt-4 text-4xl leading-[1.3] font-light text-balance text-navy-800 sm:text-5xl"
            >
              จองก่อนมา ไม่ต้องรอคิว
            </h2>
            <ol className="mt-10 space-y-7">
              {ROUTE.map((step, index) => (
                <li key={step.title} className="flex gap-5">
                  <span className="text-gold-800 grid size-10 shrink-0 place-items-center rounded-full border border-gold-600/50 font-display">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-xl text-navy-800">{step.title}</span>
                    <span className="text-ink-600 mt-1 block leading-relaxed">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-12">
              <GlowButton href={bookingHref()} size="lg">
                จองคิวออนไลน์
              </GlowButton>
            </div>
          </div>

          <div>
            <h3 className="text-gold-800 text-sm font-medium tracking-[0.06em]">
              จองตรงไปที่บริการ
            </h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <a
                    href={bookingHref(service.slug)}
                    className="group flex items-center gap-4 rounded-[20px] border border-navy-700/10 bg-white p-3 pr-5 shadow-[0_18px_36px_-30px_rgb(6_13_21/0.5)] transition-colors hover:border-gold-500/60"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-ivory-200">
                      <Photo image={service.images[0]} sizes="64px" decorative />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-navy-800">{service.name}</span>
                      <span className="text-ink-600 block text-sm">{service.durationMin} นาที</span>
                    </span>
                    <Arrow className="text-gold-800" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-ink-600 mt-6 text-sm leading-relaxed">
              อยากรู้รายละเอียดก่อน ดู
              <Link href="/services" className="text-gold-800 mx-1 underline underline-offset-4">
                บริการและราคา
              </Link>
              หรือ
              <Link href="/courses" className="text-gold-800 mx-1 underline underline-offset-4">
                คอร์สที่คุ้มกว่า
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

function InfoCell({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-navy-950 p-6 lg:p-7 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[13px] font-medium tracking-[0.06em] text-gold-400">{label}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/**
 * ปุ่ม LINE ของร้าน โหมดเดโมเป็นปุ่มตัวอย่างที่ไม่พาออกไปไหน
 * ไอดี LINE ในข้อมูลสมมติอาจเป็นบัญชีของคนอื่นจริง ๆ จึงไม่ลิงก์ออกไป
 */
function LineButton({ url, demo }: { url: string; demo: boolean }) {
  const face = (
    <>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-[#06c755] text-white"
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
          <path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.5s6-3.5 8.2-6C21.4 14.3 22 12.7 22 11c0-4.4-4.5-8-10-8Z" />
        </svg>
      </span>
      <span>เพิ่มเพื่อนใน LINE</span>
    </>
  );
  const className =
    'inline-flex items-center gap-3 rounded-full border border-gold-300/30 bg-gold-100/5 py-1.5 pr-5 pl-1.5 text-gold-100';

  if (!demo) {
    return (
      <a href={url} rel="noopener" className={`${className} hover:border-gold-300`}>
        {face}
      </a>
    );
  }
  return (
    <span className="flex flex-col items-start gap-2">
      <span className={className}>{face}</span>
      <span className="text-xs text-gold-100/55">ปุ่มตัวอย่าง ใส่ LINE OA จริงตอนส่งมอบเว็บ</span>
    </span>
  );
}
