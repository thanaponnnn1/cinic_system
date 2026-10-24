import type { Metadata } from 'next';
import Link from 'next/link';
import { Photo } from '@/components/photo';
import { PageHeader } from '@/components/page-chrome';
import { Container } from '@/components/ui';
import { content, servicesFor } from '@/content/load';
import { pageMetadata } from '@/seo/metadata';

export const metadata: Metadata = pageMetadata(content.pages.team, '/team');

export default function TeamPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ name: 'ทีมช่าง', path: '/team' }]}
        title="ทีมช่างของเรา"
        lead="ช่างประจำสามคนที่ดูแลลูกค้าเองทุกคิว เลือกช่างที่ชอบได้ตอนจอง และจองกับช่างคนเดิมได้ทุกครั้ง"
      />
      <div className="bg-ivory-50 py-20 lg:py-24">
        <Container>
          <ul className="grid gap-8 md:grid-cols-3">
            {content.team.map((member) => (
              <li key={member.slug}>
                <article className="group relative">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ivory-200">
                    <Photo
                      image={member.image}
                      sizes="(min-width: 768px) 30vw, 92vw"
                      className="transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <h2 className="mt-6 text-2xl font-normal text-navy-800">
                    <Link href={`/team/${member.slug}`} className="after:absolute after:inset-0">
                      {member.name}
                    </Link>
                  </h2>
                  <p className="text-gold-800 mt-1">
                    {member.role} · ประสบการณ์ {member.years} ปี
                  </p>
                  <p className="text-ink-600 mt-3 leading-relaxed">{member.intro}</p>
                  <p className="mt-3 text-sm text-navy-700">
                    ถนัด:{' '}
                    {servicesFor(member.specialties)
                      .map((s) => s.name)
                      .join(' · ')}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </>
  );
}
