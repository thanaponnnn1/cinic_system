import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Image as ContentImage } from '@/content/schema';

/** ห้ามแสดงรูปใหญ่เกิน 1.3 เท่าของความกว้างไฟล์ เกินนี้รูปที่ขยายมาจะเริ่มนุ่มจนเห็นได้ */
export const MAX_UPSCALE = 1.3;

/**
 * ความกว้าง CSS สูงสุดของกรอบอัตราส่วน `aspect` (กว้าง/สูง) ที่รูปยังไม่ขยายเกิน MAX_UPSCALE
 * object-cover ขยายตามด้านที่ต้องเต็มกรอบ จึงคิดจากด้านที่จำกัดกว่า
 */
export function crispMaxWidth(image: ContentImage, aspect: number): number {
  return Math.floor(MAX_UPSCALE * Math.min(image.width, image.height * aspect));
}

type PhotoProps = {
  image: ContentImage;
  sizes: string;
  className?: string;
  /** รูป LCP ของหน้า โหลดก่อนและไม่ lazy */
  preload?: boolean;
  /** รูปประดับที่มีข้อความบรรยายอยู่ข้าง ๆ แล้ว */
  decorative?: boolean;
  style?: CSSProperties;
};

/** รูปเต็มกรอบแบบ object-cover ทุกรูปผ่านตัวนี้ คุณภาพ 85 และ sizes บังคับ */
export function Photo({ image, sizes, className = '', preload, decorative, style }: PhotoProps) {
  return (
    <Image
      src={image.src}
      alt={decorative ? '' : image.alt}
      fill
      sizes={sizes}
      quality={85}
      preload={preload}
      fetchPriority={preload ? 'high' : undefined}
      loading={preload ? 'eager' : 'lazy'}
      className={`object-cover ${className}`}
      style={{ objectPosition: image.focus, ...style }}
    />
  );
}
