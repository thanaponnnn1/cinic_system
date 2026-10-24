import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE_URL } from '@/config';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';
import { breadcrumbJsonLd, type Crumb } from '@/seo/jsonld';
import { Container } from './ui';

/**
 * ส่วนที่ใช้เฉพาะบน server: JSON-LD, breadcrumb, หัวหน้ารอง
 * แยกจาก ui.tsx เพราะต้องอ่าน config (zod) ถ้าอยู่รวมกัน client component ที่ใช้ปุ่มหรือดาวจาก ui.tsx
 * จะลาก zod ทั้งก้อนเข้า JavaScript ของหน้าแรก
 */

export function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const all = [{ name: 'หน้าแรก', path: '/' }, ...crumbs];
  return (
    <>
      <nav aria-label="breadcrumb" className="text-sm text-gold-200/70">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {all.map((crumb, index) => (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>/</span>}
              {index === all.length - 1 ? (
                <span aria-current="page" className="text-gold-100">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:text-gold-100">
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all, SITE_URL)} />
    </>
  );
}

/** แถบหัวหน้าสีกรมท่าของทุกหน้ารอง: breadcrumb, h1, คำอธิบาย */
export function PageHeader({
  crumbs,
  title,
  lead,
  children,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden bg-navy-950 pt-28 pb-16 text-gold-100 lg:pt-36 lg:pb-20">
      <GlBackdrop preset="mesh-drift" className="-z-10" />
      <Container className="relative">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mt-6 max-w-4xl text-4xl leading-[1.25] font-light text-balance sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gold-100/75">{lead}</p>}
        {children}
      </Container>
    </header>
  );
}
