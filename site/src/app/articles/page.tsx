import type { Metadata } from 'next';
import Link from 'next/link';
import { Photo } from '@/components/photo';
import { PageHeader } from '@/components/page-chrome';
import { Arrow, Container } from '@/components/ui';
import { content } from '@/content/load';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.articles, '/articles');

const dateFormat = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'long',
  timeZone: 'Asia/Bangkok',
});

export default function ArticlesPage() {
  const [first, ...rest] = [...content.articles].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        crumbs={[{ name: 'บทความ', path: '/articles' }]}
        title="บทความดูแลผิวและเส้นผม"
        lead="เรื่องที่ลูกค้าถามช่างของเราบ่อย เขียนให้อ่านง่ายและทำตามได้จริงที่บ้าน"
      />
      <div className="bg-ivory-50 py-20 lg:py-24">
        <Container className="space-y-14">
          <article className="group relative grid items-center gap-8 overflow-hidden rounded-[32px] bg-white p-4 shadow-[0_30px_60px_-44px_rgb(6_13_21/0.55)] lg:grid-cols-2 lg:gap-14 lg:p-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-ivory-200">
              <Photo image={first.cover} sizes="(min-width: 1024px) 600px, 92vw" preload />
            </div>
            <div className="p-2 lg:pr-10">
              <time dateTime={first.date} className="text-gold-800 text-sm">
                {dateFormat.format(new Date(first.date))}
              </time>
              <h2 className="mt-3 text-3xl leading-snug font-normal text-navy-800 lg:text-4xl">
                <Link href={`/articles/${first.slug}`} className="after:absolute after:inset-0">
                  {first.title}
                </Link>
              </h2>
              <p className="text-ink-600 mt-4 leading-[1.9]">{first.excerpt}</p>
              <span className="text-gold-800 mt-6 inline-flex items-center gap-2">
                อ่านต่อ
                <Arrow />
              </span>
            </div>
          </article>

          <ul className="grid gap-8 md:grid-cols-2">
            {rest.map((article) => (
              <li key={article.slug}>
                <article className="group relative">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-ivory-200">
                    <Photo
                      image={article.cover}
                      sizes="(min-width: 768px) 45vw, 92vw"
                      className="transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <time dateTime={article.date} className="text-gold-800 mt-6 block text-sm">
                    {dateFormat.format(new Date(article.date))}
                  </time>
                  <h2 className="mt-2 text-2xl leading-snug font-normal text-navy-800">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-ink-600 mt-3 leading-[1.9]">{article.excerpt}</p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </>
  );
}
