import type { Metadata } from 'next';
import { JsonLd } from '@/components/page-chrome';
import { SITE_URL } from '@/config';
import { content } from '@/content/load';
import { About } from '@/sections/home/about';
import { ServicesBento } from '@/sections/home/bento';
import { ClosingCta } from '@/sections/home/closing-cta';
import { GalleryRows } from '@/sections/home/gallery-rows';
import { Hero } from '@/sections/home/hero';
import { Metrics } from '@/sections/home/metrics';
import { ReviewsSection } from '@/sections/home/reviews';
import { Roster } from '@/sections/home/roster';
import { Steps } from '@/sections/home/steps';
import { reviewsJsonLd } from '@/seo/jsonld';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.home, '/');

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <ServicesBento />
      <Metrics />
      <Steps />
      <ReviewsSection />
      <Roster />
      <GalleryRows />
      <ClosingCta />
      <JsonLd data={reviewsJsonLd(content.reviews, content.site, SITE_URL)} />
    </>
  );
}
