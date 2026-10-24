import { content, serviceBySlug } from '@/content/load';
import { OG_SIZE, renderOg } from '@/seo/og';
import { durationLabel, priceLabel } from '@/components/ui';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'ภาพแชร์บริการของ THNP Clinic';
export const dynamicParams = false;

export function generateStaticParams() {
  return content.services.map((service) => ({ slug: service.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const service = serviceBySlug((await params).slug);
  if (!service) throw new Error('unknown service');
  return renderOg({
    eyebrow: `บริการ · ${content.site.province}`,
    title: service.name,
    subtitle: `${priceLabel(service.price)} · ${durationLabel(service.durationMin)}`,
    photo: service.images[0].src,
  });
}
