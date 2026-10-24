import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-chrome';
import { Container, Stars } from '@/components/ui';
import { content, ratingSummary, toCardReview } from '@/content/load';
import { ReviewsWall } from '@/sections/reviews-wall';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.reviews, '/reviews');

export default function ReviewsPage() {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: content.reviews.filter((review) => review.rating === stars).length,
  }));

  return (
    <>
      <PageHeader
        crumbs={[{ name: 'รีวิว', path: '/reviews' }]}
        title="รีวิวจากลูกค้า"
        lead="อ่านประสบการณ์ของคนที่มาใช้บริการ กรองตามบริการที่สนใจหรือตามคะแนนได้"
      >
        <div className="mt-12 flex flex-col gap-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-gold-gradient font-display text-7xl leading-none">
              {ratingSummary.average.toFixed(1)}
            </p>
            <Stars rating={5} className="mt-3 block text-gold-300" />
            <p className="mt-2 text-sm text-gold-100/70">จาก {ratingSummary.count} รีวิว</p>
          </div>
          <dl className="w-full max-w-sm space-y-2 text-sm">
            {counts.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-3">
                <dt className="w-12 shrink-0 text-gold-100/80">{stars} ดาว</dt>
                <dd className="flex flex-1 items-center gap-3">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gold-100/10">
                    <span
                      className="block h-full origin-left rounded-full bg-gold-300"
                      style={{ transform: `scaleX(${count / Math.max(1, ratingSummary.count)})` }}
                    />
                  </span>
                  <span className="w-6 text-right text-gold-100/70">{count}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {ratingSummary.allSamples && (
          <p className="mt-10 max-w-2xl rounded-2xl border border-gold-300/25 px-5 py-4 text-sm leading-relaxed text-gold-100/80">
            รีวิวทุกชิ้นในหน้านี้เป็นรีวิวตัวอย่างที่เขียนขึ้นเพื่อสาธิตเว็บไซต์
            ไม่ใช่รีวิวจากลูกค้าจริง และไม่ถูกส่งเป็นข้อมูลโครงสร้างให้ Google
            เว็บจริงจะแสดงเฉพาะรีวิวที่ลูกค้ายินยอมให้เผยแพร่
          </p>
        )}
      </PageHeader>
      <section aria-label="รีวิวทั้งหมด" className="bg-ivory-50 py-16 lg:py-20">
        <Container>
          <ReviewsWall
            reviews={content.reviews.map((review) => ({
              ...toCardReview(review),
              serviceSlug: review.serviceSlug,
            }))}
            services={content.services
              .filter((service) =>
                content.reviews.some((review) => review.serviceSlug === service.slug),
              )
              .map(({ slug, name }) => ({ slug, name }))}
          />
        </Container>
      </section>
    </>
  );
}
