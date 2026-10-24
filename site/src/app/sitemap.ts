import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config';
import { content } from '@/content/load';

/** สร้างจากเนื้อหาอัตโนมัติ ไม่รวม /privacy และ 404 (แผน §6) โหมดเดโมก็สร้าง เพื่อดูโครงสร้างได้ */
export default function sitemap(): MetadataRoute.Sitemap {
  const latestReview = content.reviews
    .map((r) => r.date)
    .sort()
    .at(-1);
  const latestArticle = content.articles
    .map((a) => a.date)
    .sort()
    .at(-1);
  const page = (path: string, priority: number, lastModified?: string) => ({
    url: absoluteUrl(path),
    lastModified,
    priority,
  });

  return [
    page('/', 1, latestReview),
    page('/services', 0.9),
    ...content.services.map((s) => page(`/services/${s.slug}`, 0.9)),
    page('/courses', 0.8),
    page('/team', 0.7),
    ...content.team.map((m) => page(`/team/${m.slug}`, 0.6)),
    page('/gallery', 0.6),
    page('/reviews', 0.6, latestReview),
    page('/articles', 0.6, latestArticle),
    ...content.articles.map((a) => page(`/articles/${a.slug}`, 0.6, a.date)),
    page('/contact', 0.8),
  ];
}
