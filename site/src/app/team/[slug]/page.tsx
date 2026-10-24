import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Photo } from '@/components/photo';
import { ServiceCard } from '@/components/service-card';
import { Breadcrumbs, JsonLd } from '@/components/page-chrome';
import { Container } from '@/components/ui';
import { absoluteUrl, bookingHref } from '@/config';
import { content, servicesFor } from '@/content/load';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { GlowButton } from '@/effects/glow-ring';
import { pageMetadata } from '@/seo/metadata';

export const dynamicParams = false;

export function generateStaticParams() {
  return content.team.map((member) => ({ slug: member.slug }));
}

type Props = { params: Promise<{ slug: string }> };

function memberBySlug(slug: string) {
  return content.team.find((member) => member.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const member = memberBySlug((await params).slug);
  return member ? pageMetadata(member.seo, `/team/${member.slug}`) : {};
}

export default async function MemberPage({ params }: Props) {
  const member = memberBySlug((await params).slug);
  if (!member) notFound();
  const specialties = servicesFor(member.specialties);

  return (
    <>
      <header className="relative isolate overflow-hidden bg-navy-950 pt-28 pb-16 text-gold-100 lg:pt-36 lg:pb-24">
        <GlBackdrop preset="mesh-drift" className="-z-10" />
        <Container className="relative grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-[32px] bg-navy-800 lg:order-1 lg:mx-0">
            <Photo image={member.image} sizes="(min-width: 1024px) 440px, 92vw" preload />
          </div>
          <div className="lg:order-2">
            <Breadcrumbs
              crumbs={[
                { name: 'ทีมช่าง', path: '/team' },
                { name: member.name, path: `/team/${member.slug}` },
              ]}
            />
            <p className="mt-8 font-display text-2xl tracking-[0.3em] text-gold-400">
              {member.latinName}
            </p>
            <h1 className="mt-2 text-5xl leading-[1.2] font-light sm:text-6xl">{member.name}</h1>
            <p className="mt-3 text-lg text-gold-300">
              {member.role} · ประสบการณ์ {member.years} ปี
            </p>
            <div className="mt-8 max-w-xl space-y-5 text-[17px] leading-[1.95] text-gold-100/80">
              {member.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-10">
              <GlowButton href={bookingHref(member.specialties[0], member.slug)} size="lg">
                จองกับ{member.name}
              </GlowButton>
            </div>
          </div>
        </Container>
      </header>

      <section aria-labelledby="specialties-title" className="bg-ivory-50 py-20 lg:py-24">
        <Container>
          <h2 id="specialties-title" className="text-3xl font-light text-navy-800 sm:text-4xl">
            บริการที่{member.name}ถนัด
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {specialties.map((service) => (
              <li key={service.slug} className="flex flex-col gap-3">
                <ServiceCard service={service} />
                <a
                  href={bookingHref(service.slug, member.slug)}
                  className="rounded-full border border-navy-700/20 px-5 py-2.5 text-center text-sm text-navy-700 hover:border-navy-700"
                >
                  จอง{service.name}กับ{member.name}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: member.name,
          jobTitle: member.role,
          image: absoluteUrl(member.image.src),
          worksFor: { '@id': `${absoluteUrl('/')}/#business` },
        }}
      />
    </>
  );
}
