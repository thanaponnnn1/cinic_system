import { Photo } from '@/components/photo';
import { Container, Eyebrow } from '@/components/ui';
import { bookingHref } from '@/config';
import { content } from '@/content/load';
import { FlutedGlass } from '@/effects/fluted-glass';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';

/** (9) ชวนจองตอนท้าย: รูปเต็มจอทับด้วยไล่สีเข้มและเกรน ม่านแสงทองทับรูป หัวข้อใหญ่ ปุ่มวงแหวนทอง (12) กระจกลายร่องด้านขวาทับม่านแสง */
export function ClosingCta() {
  const { site, pages } = content;
  return (
    <section
      aria-labelledby="cta-title"
      className="grain relative isolate flex min-h-[86svh] items-center overflow-hidden bg-navy-950 py-24 text-gold-100"
    >
      <div className="absolute inset-0 -z-10">
        <Photo image={pages.home.ctaImage} sizes="100vw" decorative />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/80 to-navy-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-navy-950/40" />
      </div>
      <GlBackdrop preset="aurora-gold" className="-z-10" />
      <FlutedGlass className="absolute inset-y-0 right-0 -z-[5] hidden w-[42%] lg:block" />

      <Container className="relative z-10">
        <div className="max-w-2xl">
          <Eyebrow>จองคิว</Eyebrow>
          <h2
            id="cta-title"
            className="mt-5 text-5xl leading-[1.2] font-light text-balance sm:text-6xl lg:text-7xl"
          >
            ให้หนึ่งชั่วโมงนี้
            <br />
            <span className="text-gold-gradient">เป็นของคุณ</span>
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-[1.9] text-gold-100/80">
            เลือกบริการ เลือกช่าง และเลือกเวลาที่ว่างจริง จองเสร็จในไม่กี่แตะ
            แล้วรับข้อความยืนยันทาง LINE
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <GlowButton href={bookingHref()} size="lg">
              จองคิวออนไลน์
            </GlowButton>
            <a
              href={`tel:${site.phone.replace(/-/g, '')}`}
              className="text-gold-100/80 hover:text-gold-100"
            >
              หรือโทร {site.phone}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
