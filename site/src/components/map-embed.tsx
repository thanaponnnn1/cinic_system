'use client';

import { useState } from 'react';

/**
 * แผนที่แบบกดแล้วค่อยโหลด (แผน §6 Local SEO): ก่อนกดเป็นการ์ดนิ่งที่มีที่อยู่ครบ
 * ไม่มีสคริปต์หรือคุกกี้ของ Google จนกว่าผู้ใช้จะกดเอง
 */
export function MapEmbed({
  lat,
  lng,
  label,
  note,
}: {
  lat: number;
  lng: number;
  label: string;
  note?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-gold-300/15 bg-navy-900">
      {loaded ? (
        <iframe
          title={`แผนที่ ${label}`}
          src={`https://www.google.com/maps?q=${lat},${lng}&z=16&hl=th&output=embed`}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <>
          <div aria-hidden className="map-grid absolute inset-0" />
          <div
            aria-hidden
            className="absolute top-[46%] left-1/2 size-40 -translate-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(211_188_136/0.28),transparent)]"
          />
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute top-[46%] left-1/2 size-10 -translate-x-1/2 -translate-y-full text-gold-300"
            fill="currentColor"
          >
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-navy-950/95 to-transparent p-5 pt-16">
            <p className="max-w-xs text-sm leading-relaxed text-gold-100/80">
              {label}
              {note && <span className="mt-1 block text-xs text-gold-100/55">{note}</span>}
            </p>
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="rounded-full border border-gold-300/40 bg-navy-950/60 px-5 py-2.5 text-sm text-gold-100 transition-colors hover:border-gold-300"
            >
              แสดงแผนที่
            </button>
          </div>
        </>
      )}
    </div>
  );
}
