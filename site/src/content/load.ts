import { rawContent } from '../../content/index.ts';
import { SITE_MODE } from '../config.ts';
import type { CardReview } from '../components/review-card.tsx';
import { validateContent, type Review, type Service } from './schema.ts';

/** เนื้อหาที่ตรวจแล้ว โหลดครั้งเดียวต่อ process ผิดกฎข้อไหน build ล้มที่บรรทัดนี้ */
export const content = validateContent(rawContent, SITE_MODE);

export const isDemo = content.mode === 'demo';

export const yearsOpen = new Date().getFullYear() - content.site.openedYear;

const servicesBySlug = new Map(content.services.map((s) => [s.slug, s]));

export function serviceBySlug(slug: string): Service | undefined {
  return servicesBySlug.get(slug);
}

export function servicesFor(slugs: readonly string[]): Service[] {
  return slugs.flatMap((slug) => servicesBySlug.get(slug) ?? []);
}

export function reviewsFor(serviceSlug: string) {
  return content.reviews.filter((review) => review.serviceSlug === serviceSlug);
}

/** ข้อมูลที่การ์ดรีวิวใช้ แยกจาก Review เพื่อส่งเข้า client component แค่ที่จำเป็น */
export function toCardReview(review: Review): CardReview {
  return {
    id: review.id,
    text: review.text,
    rating: review.rating,
    authorDisplay: review.authorDisplay,
    serviceName: serviceBySlug(review.serviceSlug)?.name ?? '',
    date: review.date,
    isSample: review.isSample,
    avatar: review.avatar ? { src: review.avatar.src } : undefined,
  };
}

export const ratingSummary = {
  count: content.reviews.length,
  average:
    content.reviews.reduce((sum, review) => sum + review.rating, 0) /
    Math.max(1, content.reviews.length),
  allSamples: content.reviews.every((review) => review.isSample),
};

export const CATEGORY_LABEL = {
  face: 'ผิวหน้า',
  hair: 'เส้นผม',
  consult: 'ปรึกษา',
} as const;

export const GALLERY_LABEL = {
  space: 'บรรยากาศร้าน',
  face: 'ดูแลผิวหน้า',
  hair: 'ดูแลเส้นผม',
  team: 'ทีมและการปรึกษา',
} as const;
