import Link from 'next/link';
import { Arrow, Container, Eyebrow } from '@/components/ui';
import { content } from '@/content/load';
import { Lightbox } from '@/effects/lightbox';
import { ParallaxRows } from '@/effects/parallax-rows';

/** รูปและอัตราส่วนกรอบของแถวรูปหน้าแรก (กว้าง/สูง) */
const ROWS = [
  [
    ['lounge-arch-niche', 0.8],
    ['space-twin-room', 1.1],
    ['facial-treatment-tray', 1.45],
    ['space-pedicure-lounge', 1.3],
    ['eye-care', 0.72],
    ['hair-studio-chair', 1],
  ],
  [
    ['treatment-room-vanity', 1.36],
    ['haircut-scissors', 1.5],
    ['twin-room-candles', 0.85],
    ['space-hair-studio', 1.15],
    ['facial-cleansing-hands', 1.26],
    ['styling-shelves', 0.72],
  ],
] as const;

export function GalleryRows() {
  const rows = ROWS.map((row) =>
    row.map(([id, aspect]) => ({ image: content.images[id], aspect })),
  );

  return (
    <section
      aria-labelledby="gallery-title"
      className="overflow-hidden bg-navy-900 py-24 text-gold-100 lg:py-32"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>บรรยากาศ</Eyebrow>
            <h2 id="gallery-title" className="mt-4 text-4xl leading-[1.3] font-light sm:text-5xl">
              มุมต่าง ๆ ในร้าน
            </h2>
          </div>
          <Link
            href="/gallery"
            className="group inline-flex items-center gap-2 border-b border-gold-300/40 pb-1 hover:border-gold-300"
          >
            ดูแกลเลอรีทั้งหมด {content.gallery.length} รูป
            <Arrow />
          </Link>
        </div>
      </Container>
      <Lightbox className="mt-14 lg:mt-20">
        <ParallaxRows rows={rows} />
      </Lightbox>
    </section>
  );
}
