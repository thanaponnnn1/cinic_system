import Link from 'next/link';
import type { Service } from '@/content/schema';
import { Photo } from './photo';
import { Arrow, durationLabel, priceLabel } from './ui';

/** การ์ดบริการบนพื้นครีม ใช้ในหน้าบริการทั้งหมด หน้าช่าง และบริการที่เกี่ยวข้อง */
export function ServiceCard({
  service,
  headingLevel = 'h3',
}: {
  service: Service;
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_24px_50px_-36px_rgb(6_13_21/0.5)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-ivory-200">
        <Photo
          image={service.images[0]}
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 45vw, 92vw"
          className="transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading className="text-xl font-normal text-navy-800">
          <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0">
            {service.name}
          </Link>
        </Heading>
        <p className="text-ink-600 mt-2 flex-1 leading-relaxed">{service.summary}</p>
        <p className="mt-5 flex items-center gap-2 text-sm text-navy-700">
          <span className="font-medium">{priceLabel(service.price)}</span>
          <span aria-hidden className="size-1 rounded-full bg-gold-500" />
          <span>{durationLabel(service.durationMin)}</span>
          <span className="text-gold-800 ml-auto inline-flex items-center gap-1">
            รายละเอียด
            <Arrow />
          </span>
        </p>
      </div>
    </article>
  );
}
