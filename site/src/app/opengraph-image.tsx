import { content } from '@/content/load';
import { OG_SIZE, renderOg } from '@/seo/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'THNP Clinic คลินิกความงาม นครราชสีมา';

export default async function Image() {
  return renderOg({
    eyebrow: `คลินิกความงาม · ${content.site.province}`,
    title: 'ดูแลผิวและเส้นผม อย่างใจเย็น',
    subtitle: `เปิดทุกวัน ${content.site.hours.open} ถึง ${content.site.hours.close} น.`,
    photo: content.pages.home.heroImage.src,
  });
}
