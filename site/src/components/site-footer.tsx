import Link from 'next/link';
import { bookingHref } from '@/config';
import { content, isDemo } from '@/content/load';
import { WordmarkBleed } from '@/effects/wordmark-bleed';
import { NAV, Wordmark } from './site-header';
import { Container } from './ui';

export function SiteFooter() {
  const { site, services } = content;
  const a = site.address;

  return (
    <footer className="relative overflow-hidden bg-navy-950 pt-20 text-gold-100/80">
      <Container className="relative grid gap-12 pb-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-xs leading-relaxed">{site.tagline}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-gold-100/60">
            ดูแลผิวหน้าและเส้นผมใจกลางเมือง{site.province}
          </p>
        </div>

        <nav aria-label="บริการ">
          <h2 className="text-sm font-medium tracking-[0.06em] text-gold-400">บริการ</h2>
          <ul className="mt-5 space-y-2.5 text-[15px]">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`} className="hover:text-gold-100">
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="เมนูส่วนท้าย">
          <h2 className="text-sm font-medium tracking-[0.06em] text-gold-400">เมนู</h2>
          <ul className="mt-5 space-y-2.5 text-[15px]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold-100">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/privacy" className="hover:text-gold-100">
                นโยบายความเป็นส่วนตัว
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-medium tracking-[0.06em] text-gold-400">ติดต่อ</h2>
          <address className="mt-5 space-y-2.5 text-[15px] leading-relaxed not-italic">
            <p>
              {a.street} {a.subdistrict} {a.district} {a.province} {a.postalCode}
            </p>
            <p>
              โทร{' '}
              <a href={`tel:${site.phone.replace(/-/g, '')}`} className="hover:text-gold-100">
                {site.phone}
              </a>
            </p>
            <p>
              เปิดทุกวัน {site.hours.open} ถึง {site.hours.close} น.
            </p>
            <p>
              {isDemo ? (
                <Link href="/contact" className="hover:text-gold-100">
                  LINE ของร้าน
                </Link>
              ) : (
                <a href={site.lineUrl} className="hover:text-gold-100" rel="noopener">
                  LINE ของร้าน
                </a>
              )}
              {' · '}
              <a href={bookingHref()} className="text-gold-300 hover:text-gold-100">
                จองคิวออนไลน์
              </a>
            </p>
          </address>
        </div>
      </Container>

      <Container className="relative flex flex-col gap-3 border-t border-gold-300/10 py-6 text-sm text-gold-100/60 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        {isDemo && (
          <p className="text-gold-200/80">
            เว็บไซต์ตัวอย่างสำหรับเดโม ข้อมูลร้าน รีวิว และรูปภาพเป็นข้อมูลสมมติ
          </p>
        )}
      </Container>

      <WordmarkBleed text="THNP" />
    </footer>
  );
}
