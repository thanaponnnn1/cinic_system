import type { Metadata } from 'next';
import { Photo } from '@/components/photo';
import { PageHeader } from '@/components/page-chrome';
import { Container } from '@/components/ui';
import { content, GALLERY_LABEL } from '@/content/load';
import type { GalleryTile } from '@/content/schema';
import { Lightbox } from '@/effects/lightbox';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.gallery, '/gallery');

const CATEGORIES = ['space', 'face', 'hair', 'team'] as const;

/** มุมเอียงคงที่ของรูปในกอง สุ่มทุกครั้งจะทำให้ HTML แต่ละ build ไม่ตรงกัน */
const FAN = [
  'rotate-[-7deg] group-hover:-translate-x-14 group-hover:rotate-[-12deg]',
  'rotate-[5deg] group-hover:translate-x-14 group-hover:rotate-[10deg]',
  'rotate-0 group-hover:-translate-y-3',
];

export default function GalleryPage() {
  const groups = CATEGORIES.map((category) => ({
    category,
    tiles: content.gallery.filter((tile) => tile.category === category),
  }));

  return (
    <>
      <PageHeader
        crumbs={[{ name: 'แกลเลอรี', path: '/gallery' }]}
        title="บรรยากาศในร้าน"
        lead={`${content.gallery.length} รูปจากมุมพักรอ ห้องทรีตเมนต์ มุมทำผม และระหว่างให้บริการ กดที่รูปเพื่อดูแบบเต็มจอ`}
      >
        <nav aria-label="หมวดรูป" className="mt-14">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4">
            {groups.map(({ category, tiles }) => (
              <li key={category}>
                <a href={`#${category}`} className="group block text-center">
                  <span className="relative mx-auto block aspect-[4/5] w-[70%] max-w-[180px]">
                    {tiles.slice(0, 3).map((tile, index) => (
                      <span
                        key={tile.image.id}
                        className={`absolute inset-0 block overflow-hidden rounded-2xl border-4 border-ivory-50 bg-navy-800 shadow-xl transition-transform duration-500 ${FAN[index]}`}
                      >
                        <Photo image={tile.image} sizes="180px" decorative />
                      </span>
                    ))}
                  </span>
                  <span className="mt-6 block text-gold-100">{GALLERY_LABEL[category]}</span>
                  <span className="text-sm text-gold-100/60">{tiles.length} รูป</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageHeader>

      <Lightbox className="bg-ivory-50 py-20 lg:py-24">
        <Container className="space-y-20">
          {groups.map(({ category, tiles }) => (
            <section
              key={category}
              id={category}
              aria-labelledby={`${category}-title`}
              className="scroll-mt-24"
            >
              <h2
                id={`${category}-title`}
                className="text-3xl font-light text-navy-800 sm:text-4xl"
              >
                {GALLERY_LABEL[category]}
              </h2>
              <ul className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
                {tiles.map((tile) => (
                  <GalleryItem key={tile.image.id} tile={tile} />
                ))}
              </ul>
            </section>
          ))}
        </Container>
      </Lightbox>
    </>
  );
}

function GalleryItem({ tile }: { tile: GalleryTile }) {
  const { image } = tile;
  return (
    <li className="reveal-tile mb-5 break-inside-avoid">
      <a
        href={image.src}
        data-lightbox
        data-alt={image.alt}
        data-width={image.width}
        data-height={image.height}
        data-source-width={image.sourceWidth}
        className="group block"
      >
        <span
          className="relative block overflow-hidden rounded-[22px] bg-ivory-200"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        >
          <Photo
            image={image}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 92vw"
            className="transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </span>
        <span aria-hidden className="text-ink-600 mt-3 block text-sm leading-relaxed">
          {image.alt}
        </span>
      </a>
    </li>
  );
}
