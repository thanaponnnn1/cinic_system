import Link from 'next/link';
import { Photo } from '@/components/photo';
import { Container, GhostLink } from '@/components/ui';
import { bookingHref } from '@/config';
import { content } from '@/content/load';
import { Curtain } from '@/effects/curtain';
import { FocusReveal } from '@/effects/focus-reveal';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';
import { KenBurnsFrame } from '@/effects/ken-burns-frame';

const HEADLINE = ['ดูแลผิว', 'และเส้นผม', 'อย่างใจเย็น'] as const;
const HERO_SIZES = '(min-width: 1024px) 560px, 100vw';

export function Hero() {
  const { site, pages } = content;

  return (
    <section className="relative isolate overflow-hidden bg-navy-950 text-gold-100">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_78%_40%,rgb(211_188_136/0.16),transparent_70%),radial-gradient(40%_50%_at_10%_90%,rgb(61_84_112/0.35),transparent_70%)]"
      />
      {/* มือถือ: รูปเดียวกับกรอบโค้งเป็นพื้นหลังเต็มจอ ทับด้วยไล่สีเข้มและเกรน sizes ตรงกับกรอบโค้งจึงโหลดไฟล์เดียว */}
      <KenBurnsFrame className="absolute inset-0 -z-10 lg:hidden">
        <Photo image={pages.home.heroImage} sizes={HERO_SIZES} preload decorative />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/70 to-navy-950" />
      </KenBurnsFrame>
      {/* แท็บเล็ตและเดสก์ท็อป: ม่านแสงทองเหนือพื้น มือถือใช้รูปเป็นพื้นตามเดิม (hidden ทำให้ไม่โหลดโค้ด GL) */}
      <GlBackdrop preset="aurora-gold" intensity={1.5} className="-z-10 hidden md:block" />
      <Curtain />

      <Container className="relative z-10 grid min-h-[100svh] items-center gap-12 pt-28 pb-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pt-24 lg:pb-12">
        <div>
          <h1>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-medium tracking-[0.04em] text-gold-400">
              <span aria-hidden className="h-px w-8 bg-current opacity-70" />
              <span className="font-display tracking-[0.2em] uppercase">{site.name}</span>
              <span aria-hidden className="hidden sm:inline">
                ·
              </span>
              <span className="w-full whitespace-nowrap sm:w-auto">
                คลินิกความงาม {site.province}
              </span>
            </span>
            <span className="mt-7 block text-[clamp(3rem,6.2vw,6.6rem)] leading-[1.16] font-light tracking-[-0.01em]">
              <FocusReveal words={HEADLINE.slice(0, 2)} />{' '}
              <FocusReveal
                words={HEADLINE.slice(2)}
                offset={2}
                wordClassName="text-gold-gradient"
              />
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-[1.9] text-gold-100/75">
            ทรีตเมนต์ผิวหน้า นวดหน้า ทำผม และตัดผม โดยช่างประจำที่จำได้ว่าคุณชอบแบบไหน ใจกลางเมือง
            {site.province} เปิดทุกวัน
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <GlowButton href={bookingHref()} size="lg">
              จองคิวออนไลน์
            </GlowButton>
            <GhostLink href="/services">ดูบริการและราคา</GhostLink>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-gold-100/70">
            <li>
              เปิดทุกวัน {site.hours.open} ถึง {site.hours.close} น.
            </li>
            <li>จองได้ 24 ชั่วโมงผ่าน LINE</li>
            <li>
              <Link
                href="/services/consult"
                className="underline-offset-4 hover:text-gold-100 hover:underline"
              >
                ปรึกษาฟรี ไม่บังคับซื้อ
              </Link>
            </li>
          </ul>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[560px] lg:mr-0 lg:block">
          <div
            aria-hidden
            className="absolute -inset-4 translate-x-5 -translate-y-3 rounded-t-full border border-gold-300/25"
          />
          <KenBurnsFrame className="relative aspect-[4/5] rounded-t-full bg-navy-800 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)]">
            <Photo image={pages.home.heroImage} sizes={HERO_SIZES} preload />
          </KenBurnsFrame>
          <div className="absolute -bottom-6 left-4 rounded-2xl border border-gold-300/20 bg-navy-900/95 px-5 py-4 shadow-xl sm:-left-8">
            <p className="font-display text-3xl text-gold-200">{content.services.length}</p>
            <p className="text-sm text-gold-100/70">บริการผิวหน้าและเส้นผม</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
