import type { Metadata } from 'next';
import Link from 'next/link';
import { Photo } from '@/components/photo';
import { PageHeader } from '@/components/page-chrome';
import { Container, priceLabel } from '@/components/ui';
import { bookingHref } from '@/config';
import { content, serviceBySlug } from '@/content/load';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.courses, '/courses');

export default function CoursesPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: 'คอร์สและราคา', path: '/courses' }]}
        title="คอร์สและราคา"
        lead="ซื้อเป็นคอร์สแล้วราคาต่อครั้งถูกลง ดูจำนวนครั้งที่เหลือและวันหมดอายุได้เองใน LINE ร้านแจ้งเตือนก่อนคอร์สหมดอายุทุกครั้ง"
      />
      <section
        aria-label="คอร์สทั้งหมด"
        className="relative overflow-hidden bg-navy-900 py-20 text-gold-100 lg:py-28"
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/3 h-[420px] bg-[radial-gradient(50%_60%_at_50%_50%,rgb(211_188_136/0.12),transparent)]"
        />
        <Container className="relative grid items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
          {content.courses.map((course) => {
            const service = serviceBySlug(course.serviceSlug);
            if (!service) return null;
            const perSession = Math.round(course.price / course.sessions);
            return (
              <article
                key={course.slug}
                className={`relative flex flex-col overflow-hidden rounded-[30px] border p-8 ${
                  course.bestValue
                    ? 'border-gold-300/60 bg-gradient-to-b from-navy-700 to-navy-800 shadow-[0_40px_80px_-40px_rgb(211_188_136/0.45)] lg:-my-6 lg:py-14'
                    : 'border-gold-300/15 bg-navy-800/70'
                }`}
              >
                {course.bestValue && (
                  <p className="absolute top-6 right-6 rounded-full bg-gold-300 px-3 py-1 text-xs font-medium text-navy-950">
                    คุ้มที่สุด
                  </p>
                )}
                <div className="relative mb-7 h-40 overflow-hidden rounded-[20px] bg-navy-700">
                  <Photo
                    image={service.images[0]}
                    sizes="(min-width: 1024px) 380px, 92vw"
                    decorative
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent" />
                </div>
                <h2 className="text-2xl font-normal">{course.name}</h2>
                <p className="mt-2 text-gold-100/70">
                  <Link
                    href={`/services/${service.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {service.name}
                  </Link>{' '}
                  {course.sessions} ครั้ง · ใช้ได้ {course.validDays} วัน
                </p>
                <p className="text-gold-gradient mt-6 font-display text-5xl">
                  {priceLabel(course.price)}
                </p>
                <p className="mt-1 text-sm text-gold-100/60">
                  เฉลี่ยครั้งละ {perSession.toLocaleString('th-TH')} บาท (ปกติ{' '}
                  {priceLabel(service.price)})
                </p>
                <ul className="mt-7 flex-1 space-y-3 text-[15px]">
                  {course.perks.map((perk) => (
                    <li key={perk} className="flex gap-3">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold-300" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href={bookingHref(service.slug)}
                  className={`mt-8 flex justify-center rounded-full px-6 py-3.5 font-medium ${
                    course.bestValue
                      ? 'bg-gold-300 text-navy-950 hover:bg-gold-200'
                      : 'border border-gold-300/40 text-gold-100 hover:border-gold-300'
                  }`}
                >
                  จองครั้งแรกของคอร์ส
                </a>
              </article>
            );
          })}
        </Container>
        <Container className="relative mt-16">
          <p className="max-w-2xl text-sm leading-relaxed text-gold-100/60">
            ซื้อคอร์สได้ที่ร้านในวันที่มารับบริการครั้งแรก ราคารวมภาษีแล้ว คอร์สใช้ได้กับช่างทุกคน
            และเลื่อนนัดได้ผ่าน LINE ก่อนเวลานัดอย่างน้อย 3 ชั่วโมง
          </p>
        </Container>
      </section>
    </>
  );
}
