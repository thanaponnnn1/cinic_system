import Link from 'next/link';
import { Photo } from '@/components/photo';
import { Arrow, Container, durationLabel, Eyebrow, priceLabel } from '@/components/ui';
import { CATEGORY_LABEL, content, servicesFor } from '@/content/load';
import type { Service } from '@/content/schema';
import { PointerParallax } from '@/effects/pointer-parallax';

/**
 * ตำแหน่งกล่องทั้ง 5 บน grid 12 คอลัมน์ 2 แถว: ใหญ่ · กว้าง · สูง · เล็ก · เล็ก
 * sizes คิดจากความกว้างกล่องจริงบนจอใหญ่ (container สูงสุด 1264px)
 */
const TILES = [
  { area: 'lg:col-span-5 lg:row-span-2', sizes: '(min-width: 1024px) 40vw, 78vw', big: true },
  { area: 'lg:col-span-4', sizes: '(min-width: 1024px) 32vw, 78vw', big: false },
  { area: 'lg:col-span-3 lg:row-span-2', sizes: '(min-width: 1024px) 24vw, 78vw', big: false },
  { area: 'lg:col-span-2', sizes: '(min-width: 1024px) 16vw, 78vw', big: false },
  { area: 'lg:col-span-2', sizes: '(min-width: 1024px) 16vw, 78vw', big: false },
] as const;

export function ServicesBento() {
  const featured = servicesFor(content.pages.home.featuredServices);

  return (
    <section aria-labelledby="bento-title" className="overflow-hidden bg-ivory-50 py-24 lg:py-32">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow tone="ink">บริการเด่น</Eyebrow>
            <h2
              id="bento-title"
              className="mt-4 max-w-2xl text-4xl leading-[1.3] font-light text-navy-800 sm:text-5xl"
            >
              เลือกเวลาให้ตัวเอง<span className="whitespace-nowrap">สักชั่วโมง</span>
            </h2>
          </div>
          <Link
            href="/services"
            className="group inline-flex items-center gap-2 border-b border-navy-700/30 pb-1 text-navy-700 hover:border-navy-700"
          >
            ดูบริการทั้งหมด {content.services.length} รายการ
            <Arrow />
          </Link>
        </div>
      </Container>

      <PointerParallax className="mt-12 lg:mx-auto lg:max-w-[1360px] lg:px-12">
        <ul
          aria-label="บริการเด่น"
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(1rem,calc(50%-9.5rem))] py-4 lg:grid lg:grid-cols-12 lg:grid-rows-[310px_310px] lg:gap-5 lg:overflow-visible lg:p-0"
        >
          {featured.map((service, index) => (
            <li
              key={service.slug}
              className={`depth-card w-[19rem] max-w-[78vw] shrink-0 snap-center lg:w-auto lg:max-w-none ${TILES[index].area}`}
            >
              <BentoTile service={service} {...TILES[index]} />
            </li>
          ))}
        </ul>
      </PointerParallax>
    </section>
  );
}

function BentoTile({ service, sizes, big }: { service: Service; sizes: string; big: boolean }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      data-parallax
      className="group relative flex aspect-[3/4] h-full flex-col justify-end overflow-hidden rounded-[28px] bg-navy-800 text-gold-100 lg:aspect-auto"
    >
      <span className="parallax-media absolute inset-0 block">
        <Photo image={service.images[0]} sizes={sizes} decorative />
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-navy-950/0" />
      <span className="absolute top-5 left-5 rounded-full border border-gold-100/30 bg-navy-950/40 px-3 py-1 text-xs tracking-wide">
        {CATEGORY_LABEL[service.category]}
      </span>
      <span className="relative p-6 lg:p-7">
        <span className={`block font-normal ${big ? 'text-3xl lg:text-4xl' : 'text-2xl'}`}>
          {service.name}
        </span>
        {big && (
          <span className="mt-3 block max-w-sm leading-relaxed text-gold-100/75">
            {service.summary}
          </span>
        )}
        <span className="mt-3 flex items-center gap-2 text-sm text-gold-100/80">
          <span>{priceLabel(service.price)}</span>
          <span aria-hidden className="size-1 rounded-full bg-gold-300" />
          <span>{durationLabel(service.durationMin)}</span>
        </span>
      </span>
      <span
        aria-hidden
        className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-gold-100 text-navy-950 transition-transform duration-500 group-hover:-rotate-45"
      >
        <Arrow />
      </span>
    </Link>
  );
}
