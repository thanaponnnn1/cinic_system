import { Photo } from '@/components/photo';
import type { Image } from '@/content/schema';

/** ความเร็วต่อรูป (เท่าของระยะ 120px ตลอดช่วงที่รูปอยู่บนจอ) วนตามลำดับ ค่าคงที่ไม่สุ่ม HTML จึงเหมือนเดิมทุกครั้ง */
const SPEEDS = [0.35, -0.2, 0.6, 0.1, -0.4, 0.45, -0.1];

type Tile = { image: Image; aspect: number };

/**
 * (8) แถวรูปหลายขนาด แต่ละรูปเลื่อนขึ้นลงด้วยความเร็วต่างกันขณะเลื่อนหน้า (เดสก์ท็อป)
 * ใช้ CSS view timeline (.parallax-item) ทำงานบน compositor มือถือเป็นแถวเลื่อนแนวนอนธรรมดา
 * ทุกรูปเป็นลิงก์ไปไฟล์รูป (data-lightbox) ห่อด้วย <Lightbox> แล้วกดเปิดดูเต็มจอได้
 */
export function ParallaxRows({ rows, height = 380 }: { rows: Tile[][]; height?: number }) {
  let n = 0;
  return (
    <div className="space-y-5 lg:space-y-8">
      {rows.map((row, rowIndex) => (
        <ul
          key={rowIndex}
          className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-4 sm:px-6 lg:snap-none lg:justify-center lg:gap-6 lg:overflow-visible lg:px-12"
        >
          {row.map(({ image, aspect }) => {
            const speed = SPEEDS[n++ % SPEEDS.length];
            const width = Math.round(height * aspect);
            return (
              <li
                key={image.id}
                className="parallax-item shrink-0 snap-center"
                style={{ '--speed': speed } as React.CSSProperties}
              >
                <a
                  href={image.src}
                  data-lightbox
                  data-alt={image.alt}
                  data-width={image.width}
                  data-height={image.height}
                  data-source-width={image.sourceWidth}
                  aria-label={`ดูรูปเต็มจอ: ${image.alt}`}
                  className="group relative block h-[240px] w-[calc(240px*var(--a))] overflow-hidden rounded-[20px] bg-navy-800 sm:h-[300px] sm:w-[calc(300px*var(--a))] lg:h-[var(--h)] lg:w-[calc(var(--h)*var(--a))]"
                  style={{ '--h': `${height}px`, '--a': aspect } as React.CSSProperties}
                >
                  <Photo
                    image={image}
                    sizes={`(min-width: 1024px) ${width}px, ${Math.round(300 * aspect)}px`}
                    className="transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}
