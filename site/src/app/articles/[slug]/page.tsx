import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/photo';
import { ServiceCard } from '@/components/service-card';
import { Breadcrumbs, JsonLd } from '@/components/page-chrome';
import { Container, KeepWords } from '@/components/ui';
import { bookingHref, SITE_URL } from '@/config';
import { content, servicesFor } from '@/content/load';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';
import { articleJsonLd } from '@/seo/jsonld';
import { pageMetadata } from '@/seo/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return content.articles.map((article) => ({ slug: article.slug }));
}

type Props = { params: Promise<{ slug: string }> };

const dateFormat = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'long',
  timeZone: 'Asia/Bangkok',
});

function articleBySlug(slug: string) {
  return content.articles.find((article) => article.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  return article
    ? pageMetadata(article.seo, `/articles/${article.slug}`, {
        type: 'article',
        image: article.cover.src,
      })
    : {};
}

export default async function ArticlePage({ params }: Props) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const { default: Body } = await import(`../../../../content/articles/${article.slug}.mdx`);
  const related = servicesFor(article.relatedServices);

  return (
    <>
      <header className="relative isolate overflow-hidden bg-navy-950 pt-28 pb-14 text-gold-100 lg:pt-36 lg:pb-16">
        <GlBackdrop preset="mesh-drift" className="-z-10" />
        <Container max="max-w-[900px]">
          <Breadcrumbs
            crumbs={[
              { name: 'บทความ', path: '/articles' },
              { name: article.title, path: `/articles/${article.slug}` },
            ]}
          />
          <time dateTime={article.date} className="mt-8 block text-sm text-gold-400">
            {dateFormat.format(new Date(article.date))}
          </time>
          <h1 className="mt-3 text-4xl leading-[1.3] font-light text-balance sm:text-5xl">
            <KeepWords text={article.title} />
          </h1>
          <p className="mt-6 text-lg leading-[1.9] text-gold-100/75">{article.excerpt}</p>
        </Container>
      </header>

      <div className="bg-ivory-50 pb-20 lg:pb-24">
        <Container max="max-w-[900px]">
          <div className="relative -mt-2 aspect-[16/9] overflow-hidden rounded-b-[28px] bg-ivory-200 lg:rounded-[28px]">
            <Photo image={article.cover} sizes="(min-width: 900px) 804px, 100vw" preload />
          </div>
          <article className="prose-th mx-auto mt-14 max-w-[680px]">
            <Body />
          </article>

          <aside
            aria-label="จองคิว"
            className="mx-auto mt-16 max-w-[680px] rounded-[28px] bg-navy-950 p-8 text-gold-100"
          >
            <p className="text-2xl font-light">อยากให้ช่างดูแลให้แทน?</p>
            <p className="mt-2 text-gold-100/75">จองเวลาที่ว่างจริงได้ทันที ยืนยันทาง LINE</p>
            <div className="mt-6">
              <GlowButton href={bookingHref(article.relatedServices[0])}>จองคิวออนไลน์</GlowButton>
            </div>
          </aside>
        </Container>

        <Container className="mt-20">
          <h2 className="text-3xl font-light text-navy-800">บริการที่เกี่ยวข้อง</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((service) => (
              <li key={service.slug}>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
        </Container>
      </div>

      <JsonLd data={articleJsonLd(article, content.site, SITE_URL)} />
    </>
  );
}
