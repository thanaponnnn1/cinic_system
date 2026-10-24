import Link from 'next/link';
import { Photo } from '@/components/photo';
import { Arrow, Container, Eyebrow } from '@/components/ui';
import { bookingHref } from '@/config';
import { content, servicesFor } from '@/content/load';
import { LetterRoll } from '@/effects/letter-roll';
import { PortraitWipe } from '@/effects/portrait-wipe';

/**
 * (7) ทีมช่าง: เดสก์ท็อปเป็นรายชื่อตัวใหญ่ เอาเมาส์ชี้แล้วตัวอักษรหมุนและรูปเลื่อนเผย
 * มือถือเป็นการ์ดที่แตะแล้วขยายเป็นโปรไฟล์ (<details> ของเบราว์เซอร์ ไม่ต้องใช้ JavaScript)
 */
export function Roster() {
  return (
    <section aria-labelledby="team-title" className="bg-ivory-50 py-24 lg:py-32">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow tone="ink">ทีมช่าง</Eyebrow>
            <h2
              id="team-title"
              className="mt-4 text-4xl leading-[1.3] font-light text-navy-800 sm:text-5xl"
            >
              คนที่จะดูแลคุณ
            </h2>
          </div>
          <Link
            href="/team"
            className="group inline-flex items-center gap-2 border-b border-navy-700/30 pb-1 text-navy-700 hover:border-navy-700"
          >
            รู้จักทีมช่าง
            <Arrow />
          </Link>
        </div>

        <ul className="mt-14 hidden border-t border-navy-700/15 lg:block">
          {content.team.map((member) => (
            <li key={member.slug} className="border-b border-navy-700/15">
              <Link
                href={`/team/${member.slug}`}
                className="roll-row grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_200px] items-center gap-10 py-8"
              >
                <LetterRoll
                  text={member.latinName}
                  className="font-display text-[clamp(4.5rem,8vw,8.5rem)] leading-none font-medium text-navy-800"
                />
                <span>
                  <span className="block text-3xl font-normal text-navy-800">{member.name}</span>
                  <span className="text-gold-800 mt-1 block">
                    {member.role} · ประสบการณ์ {member.years} ปี
                  </span>
                  <span className="text-ink-600 mt-3 block max-w-md leading-relaxed">
                    {member.intro}
                  </span>
                </span>
                <span className="block h-[240px] w-[200px]">
                  <PortraitWipe image={member.image} sizes="200px" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="mt-10 space-y-4 lg:hidden">
          {content.team.map((member) => (
            <li key={member.slug}>
              <details className="group overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_-30px_rgb(6_13_21/0.5)]">
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-ivory-200">
                    <Photo image={member.image} sizes="96px" decorative />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl text-navy-800">{member.name}</span>
                    <span className="text-gold-800 block text-sm">{member.role}</span>
                  </span>
                  <span
                    aria-hidden
                    className="text-gold-800 ml-auto text-2xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-6">
                  <p className="text-ink-600 leading-relaxed">{member.intro}</p>
                  <p className="mt-3 text-sm text-navy-700">
                    ถนัด:{' '}
                    {servicesFor(member.specialties)
                      .map((s) => s.name)
                      .join(' · ')}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={bookingHref(member.specialties[0], member.slug)}
                      className="rounded-full bg-navy-800 px-5 py-2.5 text-sm text-gold-100"
                    >
                      จองกับ{member.name}
                    </a>
                    <Link
                      href={`/team/${member.slug}`}
                      className="rounded-full border border-navy-700/25 px-5 py-2.5 text-sm text-navy-700"
                    >
                      ดูโปรไฟล์
                    </Link>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
