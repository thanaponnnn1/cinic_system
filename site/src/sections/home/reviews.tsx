import Link from 'next/link';
import { Arrow, Container, Eyebrow, SampleBadge, Stars } from '@/components/ui';
import { content, ratingSummary, toCardReview } from '@/content/load';
import type { Review } from '@/content/schema';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { Marquee } from '@/effects/marquee';
import { ReviewDeck } from '@/effects/review-deck';

export function ReviewsSection() {
  const byId = new Map(content.reviews.map((review) => [review.id, review]));
  const featured = content.pages.home.featuredReviews.flatMap((id) => byId.get(id) ?? []);
  const rest = content.reviews.filter(
    (review) => !content.pages.home.featuredReviews.includes(review.id),
  );
  const half = Math.ceil(rest.length / 2);

  return (
    <section
      aria-labelledby="reviews-title"
      className="relative isolate overflow-hidden bg-navy-950 py-24 text-gold-100 lg:py-32"
    >
      <GlBackdrop preset="mesh-drift" className="-z-10" />
      <Container className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>รีวิว</Eyebrow>
          <h2
            id="reviews-title"
            className="mt-4 text-4xl leading-[1.3] font-light text-balance sm:text-5xl"
          >
            เสียงจากคนที่มาพักกับเราแล้ว
          </h2>
          <p className="mt-6 flex items-center gap-3 text-gold-100/80">
            <Stars rating={5} className="text-gold-300" />
            <span>
              {ratingSummary.average.toFixed(1)} จาก {ratingSummary.count} รีวิว
            </span>
          </p>
          {ratingSummary.allSamples && (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-gold-100/60">
              รีวิวทั้งหมดในเว็บเดโมนี้เป็นรีวิวตัวอย่างที่เขียนขึ้นเพื่อสาธิต ติดป้าย “ตัวอย่าง”
              ไว้ทุกชิ้น
            </p>
          )}
          <Link
            href="/reviews"
            className="group mt-10 inline-flex items-center gap-2 border-b border-gold-300/40 pb-1 hover:border-gold-300"
          >
            อ่านรีวิวทั้งหมด
            <Arrow />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-[540px]">
          <ReviewDeck reviews={featured.map(toCardReview)} />
        </div>
      </Container>

      <div aria-label="รีวิวเพิ่มเติม" role="region" className="mt-24 hidden space-y-4 lg:block">
        <Marquee>
          {rest.slice(0, half).map((review) => (
            <Snippet key={review.id} review={review} />
          ))}
        </Marquee>
        <Marquee reverse>
          {rest.slice(half).map((review) => (
            <Snippet key={review.id} review={review} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function Snippet({ review }: { review: Review }) {
  return (
    <figure className="flex w-[380px] shrink-0 flex-col gap-3 rounded-[20px] border border-gold-300/15 bg-navy-900/92 p-5">
      <div className="flex items-center gap-3 text-sm">
        <Stars rating={review.rating} className="text-gold-300" />
        <figcaption className="text-gold-100/80">{review.authorDisplay}</figcaption>
        {review.isSample && (
          <span className="ml-auto">
            <SampleBadge tone="dark" />
          </span>
        )}
      </div>
      <blockquote className="line-clamp-3 text-[15px] leading-[1.8] text-gold-100/85">
        {review.text}
      </blockquote>
    </figure>
  );
}
