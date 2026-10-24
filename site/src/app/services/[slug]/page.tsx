import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/photo';
import { ReviewCard } from '@/components/review-card';
import { ServiceCard } from '@/components/service-card';
import { Breadcrumbs, JsonLd } from '@/components/page-chrome';
import {
  Container,
  durationLabel,
  Eyebrow,
  GhostLink,
  KeepWords,
  priceLabel,
} from '@/components/ui';
import { bookingHref, SITE_URL } from '@/config';
import { CATEGORY_LABEL, content, reviewsFor, serviceBySlug, toCardReview } from '@/content/load';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';
import { Lightbox } from '@/effects/lightbox';
import { faqJsonLd, serviceJsonLd } from '@/seo/jsonld';
import { pageMetadata } from '@/seo/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return content.services.map((service) => ({ slug: service.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = serviceBySlug((await params).slug);
  return service
    ? pageMetadata(service.seo, `/services/${service.slug}`, {
        image: `/services/${service.slug}/opengraph-image`,
      })
    : {};
}

export default async function ServicePage({ params }: Props) {
  const service = serviceBySlug((await params).slug);
  if (!service) notFound();

  const reviews = reviewsFor(service.slug);
  const stylists = content.team.filter((member) => member.specialties.includes(service.slug));
  const related = content.services
    .filter((s) => s.slug !== service.slug)
    .sort(
      (a, b) => Number(b.category === service.category) - Number(a.category === service.category),
    )
    .slice(0, 3);
  const [main, ...more] = service.images;

  return (
    <>
      <header className="relative isolate overflow-hidden bg-navy-950 pt-28 pb-16 text-gold-100 lg:pt-36 lg:pb-24">
        <GlBackdrop preset="mesh-drift" className="-z-10" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <Breadcrumbs
              crumbs={[
                { name: 'บริการ', path: '/services' },
                { name: service.name, path: `/services/${service.slug}` },
              ]}
            />
            <p className="mt-8 text-[15px] tracking-[0.06em] text-gold-400">
              {CATEGORY_LABEL[service.category]}
            </p>
            <h1 className="mt-3 text-[2.6rem] leading-[1.2] font-light sm:text-6xl">
              <KeepWords text={service.name} />
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-[1.9] text-gold-100/80">
              {service.summary}
            </p>
            <dl className="mt-8 flex flex-wrap gap-3 text-sm">
              <div className="rounded-full border border-gold-300/30 px-4 py-2">
                <dt className="sr-only">ราคา</dt>
                <dd>{priceLabel(service.price)}</dd>
              </div>
              <div className="rounded-full border border-gold-300/30 px-4 py-2">
                <dt className="sr-only">ระยะเวลา</dt>
                <dd>{durationLabel(service.durationMin)}</dd>
              </div>
            </dl>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <GlowButton href={bookingHref(service.slug)} size="lg">
                จองบริการนี้
              </GlowButton>
              {service.slug !== 'consult' && (
                <GhostLink href="/services/consult">ปรึกษาฟรีก่อน</GhostLink>
              )}
            </div>
          </div>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[32px] bg-navy-800 lg:mr-0">
            <Photo image={main} sizes="(min-width: 1024px) 460px, 92vw" preload />
          </div>
        </Container>
      </header>

      <div className="bg-ivory-50">
        <Container className="grid gap-14 py-20 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20 lg:py-24">
          <div>
            <h2 className="text-3xl font-light text-navy-800 sm:text-4xl">เกี่ยวกับบริการนี้</h2>
            <p className="mt-6 text-[17px] leading-[2] text-navy-700">{service.intro}</p>

            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              <section aria-labelledby="fit-title">
                <h3 id="fit-title" className="text-xl font-normal text-navy-800">
                  เหมาะกับใคร
                </h3>
                <ul className="text-ink-600 mt-4 space-y-3">
                  {service.suitableFor.map((item) => (
                    <li key={item} className="flex gap-3 leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0 rotate-45 bg-gold-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section aria-labelledby="after-title">
                <h3 id="after-title" className="text-xl font-normal text-navy-800">
                  ดูแลหลังทำ
                </h3>
                <ul className="text-ink-600 mt-4 space-y-3">
                  {service.aftercare.map((item) => (
                    <li key={item} className="flex gap-3 leading-relaxed">
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0 rotate-45 bg-gold-500"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section aria-labelledby="steps-title" className="mt-16">
              <h2 id="steps-title" className="text-3xl font-light text-navy-800 sm:text-4xl">
                ขั้นตอน
              </h2>
              <ol className="mt-6 border-t border-navy-700/10">
                {service.steps.map((step, index) => (
                  <li key={step.title} className="border-b border-navy-700/10">
                    <details name="service-steps" open={index === 0} className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-5 py-5 [&::-webkit-details-marker]:hidden">
                        <span className="text-gold-800 grid size-9 shrink-0 place-items-center rounded-full border border-gold-600/50 font-display group-open:bg-navy-800 group-open:text-gold-200">
                          {index + 1}
                        </span>
                        <span className="text-xl text-navy-800">{step.title}</span>
                        <span
                          aria-hidden
                          className="text-gold-800 ml-auto text-2xl transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="text-ink-600 pb-6 pl-14 leading-[1.9]">{step.body}</p>
                    </details>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside aria-label="จองบริการ" className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] bg-navy-950 p-7 text-gold-100">
              <p className="text-sm text-gold-100/70">ราคา</p>
              <p className="mt-1 font-display text-4xl text-gold-200">
                {priceLabel(service.price)}
              </p>
              <p className="mt-2 text-gold-100/70">
                ใช้เวลาประมาณ {durationLabel(service.durationMin)}
              </p>
              <a
                href={bookingHref(service.slug)}
                className="mt-6 flex justify-center rounded-full bg-gold-300 px-6 py-3.5 font-medium text-navy-950 hover:bg-gold-200"
              >
                เลือกวันและเวลา
              </a>
              {stylists.length > 0 && (
                <div className="mt-8 border-t border-gold-300/15 pt-6">
                  <p className="text-sm text-gold-100/70">ช่างที่ถนัดบริการนี้</p>
                  <ul className="mt-4 space-y-3">
                    {stylists.map((member) => (
                      <li key={member.slug} className="flex items-center gap-3">
                        <span className="relative size-11 overflow-hidden rounded-full bg-navy-800">
                          <Photo image={member.image} sizes="44px" decorative />
                        </span>
                        <Link href={`/team/${member.slug}`} className="hover:text-gold-200">
                          {member.name}
                          <span className="block text-xs text-gold-100/60">{member.role}</span>
                        </Link>
                        <a
                          href={bookingHref(service.slug, member.slug)}
                          className="ml-auto rounded-full border border-gold-300/30 px-3 py-1.5 text-xs hover:border-gold-300"
                        >
                          จองกับ{member.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </div>

      <section
        aria-labelledby="photos-title"
        className="overflow-hidden bg-ivory-100 py-20 lg:py-24"
      >
        <Container>
          <h2 id="photos-title" className="text-3xl font-light text-navy-800 sm:text-4xl">
            รูปบรรยากาศ
          </h2>
        </Container>
        <Lightbox className="mt-8">
          <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(1rem,calc(50%-9.5rem))] py-2 lg:mx-auto lg:grid lg:max-w-[1360px] lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-12">
            {[main, ...more].map((image) => (
              <li
                key={image.id}
                className="depth-card w-[19rem] max-w-[78vw] shrink-0 snap-center lg:w-auto lg:max-w-none"
              >
                <a
                  href={image.src}
                  data-lightbox
                  data-alt={image.alt}
                  data-width={image.width}
                  data-height={image.height}
                  data-source-width={image.sourceWidth}
                  aria-label={`ดูรูปเต็มจอ: ${image.alt}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-[24px] bg-ivory-200"
                >
                  <Photo
                    image={image}
                    sizes="(min-width: 1024px) 300px, 78vw"
                    className="transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Lightbox>
      </section>

      <section aria-labelledby="faq-title" className="bg-ivory-50 py-20 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <Eyebrow tone="ink">คำถามที่พบบ่อย</Eyebrow>
            <h2 id="faq-title" className="mt-4 text-3xl font-light text-navy-800 sm:text-4xl">
              ถามบ่อยเรื่อง{service.name}
            </h2>
          </div>
          <div className="border-t border-navy-700/10">
            {service.faqs.map((faq) => (
              <details key={faq.q} className="group border-b border-navy-700/10">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-lg text-navy-800 [&::-webkit-details-marker]:hidden">
                  <h3 className="font-normal">{faq.q}</h3>
                  <span
                    aria-hidden
                    className="text-gold-800 ml-auto text-2xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-ink-600 pb-6 leading-[1.9]">{faq.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {reviews.length > 0 && (
        <section aria-labelledby="svc-reviews-title" className="bg-ivory-100 py-20 lg:py-24">
          <Container>
            <h2 id="svc-reviews-title" className="text-3xl font-light text-navy-800 sm:text-4xl">
              รีวิว{service.name}
            </h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {reviews.slice(0, 6).map((review) => (
                <li key={review.id}>
                  <ReviewCard review={toCardReview(review)} className="h-full" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section aria-labelledby="related-title" className="bg-ivory-50 py-20 lg:py-24">
        <Container>
          <h2 id="related-title" className="text-3xl font-light text-navy-800 sm:text-4xl">
            บริการที่เกี่ยวข้อง
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((s) => (
              <li key={s.slug}>
                <ServiceCard service={s} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <JsonLd data={serviceJsonLd(service, SITE_URL)} />
      <JsonLd data={faqJsonLd(service.faqs)} />
    </>
  );
}
