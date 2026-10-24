'use client';

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import Link from 'next/link';
import { useRef, type RefObject } from 'react';
import { durationLabel, priceLabel } from '@/lib/customer-format';
import type { ShopService } from '@/lib/customer-types';

/** ความกว้างการ์ดเล็กพอให้รูปกว้าง 400px (นวดหน้า) ยังคมบนจอ 2x */
const CARD_WIDTH = 216;

/**
 * carousel บริการแบบมีมิติ: การ์ดตรงกลางเต็มขนาด การ์ดที่ห่างออกไปเล็กลงและจางลง
 *
 * ใช้การเลื่อนของเบราว์เซอร์เอง (scroll-snap) แทนการลากด้วย JavaScript นิ้วจึงลื่นเท่าการเลื่อน
 * หน้าเว็บปกติแม้บนเครื่องช้า ส่วนมิติคิดจากตำแหน่งการเลื่อน และขยับแค่ scale กับ opacity
 * ใช้ชั้นสีครีมจางทับแทน blur เพราะ blur บนชั้นที่กำลังเลื่อนกิน GPU ของ Android รุ่นล่างมาก
 */
export function ServicesCarousel({ services }: { services: ShopService[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scroller}
      className="no-scrollbar flex snap-x snap-mandatory gap-1 overflow-x-auto py-2"
      style={{ paddingInline: `calc(50% - ${CARD_WIDTH / 2}px)` }}
    >
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} scroller={scroller} />
      ))}
    </div>
  );
}

function ServiceCard({
  service,
  scroller,
}: {
  service: ShopService;
  scroller: RefObject<HTMLDivElement | null>;
}) {
  const card = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollXProgress } = useScroll({
    container: scroller,
    target: card,
    axis: 'x',
    offset: ['start end', 'end start'],
  });

  return (
    <Link
      ref={card}
      href={`/c/book?service=${service.id}`}
      className="shrink-0 snap-center rounded-[28px] focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none"
      style={{ width: CARD_WIDTH }}
    >
      {reduceMotion ? (
        <CardFace service={service} />
      ) : (
        <DepthFace service={service} progress={scrollXProgress} />
      )}
    </Link>
  );
}

function DepthFace({ service, progress }: { service: ShopService; progress: MotionValue<number> }) {
  const scale = useTransform(progress, [0.15, 0.5, 0.85], [0.84, 1, 0.84]);
  const wash = useTransform(progress, [0.15, 0.5, 0.85], [0.5, 0, 0.5]);

  return (
    <motion.div style={{ scale }} className="relative">
      <CardFace service={service} />
      <motion.span
        aria-hidden
        style={{ opacity: wash }}
        className="pointer-events-none absolute inset-0 rounded-[28px] bg-ivory-50"
      />
    </motion.div>
  );
}

function CardFace({ service }: { service: ShopService }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-ivory-200">
      {service.imageUrl && (
        <img
          src={service.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-ivory-50">
        <p className="text-[17px] leading-snug font-medium">{service.name}</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-ivory-100">
          <span>{priceLabel(service.price)}</span>
          <span aria-hidden className="size-1 rounded-full bg-gold-300" />
          <span>{durationLabel(service.durationMin)}</span>
        </p>
      </div>
    </div>
  );
}
