import { Photo } from '@/components/photo';
import type { Image } from '@/content/schema';

/**
 * (7) รูปช่างเลื่อนเผยเมื่อเอาเมาส์ชี้แถว roll-row: แผ่นสีพื้นหดออกทางขวา (scaleX)
 * พร้อมรูปที่ค่อย ๆ หดจาก 1.12 เป็น 1 ขยับแค่ transform CSS ล้วน
 */
export function PortraitWipe({ image, sizes }: { image: Image; sizes: string }) {
  return (
    <span className="relative block size-full overflow-hidden rounded-[22px] bg-ivory-200">
      <span className="wipe-photo absolute inset-0 block">
        <Photo image={image} sizes={sizes} decorative />
      </span>
      <span aria-hidden className="wipe-cover absolute inset-0 block bg-ivory-100" />
    </span>
  );
}
