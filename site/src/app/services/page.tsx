import type { Metadata } from 'next';
import { ServiceCard } from '@/components/service-card';
import { PageHeader } from '@/components/page-chrome';
import { Container } from '@/components/ui';
import { CATEGORY_LABEL, content } from '@/content/load';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.services, '/services');

const CATEGORY_LEAD = {
  face: 'ทรีตเมนต์ ทำความสะอาด นวดหน้า และดูแลรอบดวงตา เลือกสูตรตามสภาพผิวในวันนั้น',
  hair: 'บำรุง สระไดร์ และตัดแต่งทรงโดยช่างผมที่ถามไลฟ์สไตล์ก่อนลงกรรไกร',
  consult: 'ยังไม่แน่ใจว่าจะเริ่มจากอะไร คุยกับช่างผู้เชี่ยวชาญได้ฟรี ไม่บังคับซื้อ',
} as const;

export default function ServicesPage() {
  const categories = (['face', 'hair', 'consult'] as const).map((category) => ({
    category,
    services: content.services.filter((service) => service.category === category),
  }));

  return (
    <>
      <PageHeader
        crumbs={[{ name: 'บริการ', path: '/services' }]}
        title={`บริการผิวหน้าและเส้นผม ${content.site.province}`}
        lead="ทุกบริการมีราคาและระยะเวลาชัดเจน กดดูรายละเอียด ขั้นตอน และคำถามที่พบบ่อย แล้วจองเวลาที่ว่างจริงได้ทันที"
      />
      <div className="bg-ivory-50 py-20 lg:py-24">
        <Container className="space-y-20">
          {categories.map(({ category, services }) => (
            <section key={category} aria-labelledby={`cat-${category}`}>
              <div className="max-w-2xl">
                <h2
                  id={`cat-${category}`}
                  className="text-3xl font-light text-navy-800 sm:text-4xl"
                >
                  {CATEGORY_LABEL[category]}
                </h2>
                <p className="text-ink-600 mt-3 leading-relaxed">{CATEGORY_LEAD[category]}</p>
              </div>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <ServiceCard service={service} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </Container>
      </div>
    </>
  );
}
