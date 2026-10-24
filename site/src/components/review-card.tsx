import Image from 'next/image';
import { SampleBadge, Stars } from './ui';

/** ข้อมูลรีวิวที่การ์ดต้องใช้ ส่งเข้า client component ได้ (ไม่มีฟังก์ชัน) */
export type CardReview = {
  id: string;
  text: string;
  rating: number;
  authorDisplay: string;
  serviceName: string;
  date: string;
  isSample: boolean;
  avatar?: { src: string };
};

const dateFormat = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Bangkok',
});

/** การ์ดรีวิวใบเดียว ใช้ทุกที่ในเว็บ ป้าย "ตัวอย่าง" ของรีวิวตัวอย่างมาจากที่นี่ที่เดียว */
export function ReviewCard({ review, className = '' }: { review: CardReview; className?: string }) {
  return (
    <figure
      className={`flex flex-col rounded-[24px] border border-ivory-200 bg-white p-6 text-navy-700 shadow-[0_18px_40px_-28px_rgb(6_13_21/0.45)] ${className}`}
    >
      <div className="flex items-center gap-3">
        {review.avatar ? (
          <Image
            src={review.avatar.src}
            alt=""
            width={44}
            height={44}
            sizes="44px"
            quality={85}
            className="size-11 rounded-full object-cover ring-1 ring-gold-500/50"
          />
        ) : (
          <span
            aria-hidden
            className="text-gold-800 grid size-11 place-items-center rounded-full bg-ivory-100 font-display text-lg ring-1 ring-gold-500/50"
          >
            {review.authorDisplay.replace('คุณ', '').trim().slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <figcaption className="font-medium">{review.authorDisplay}</figcaption>
          <p className="text-ink-600 truncate text-sm">{review.serviceName}</p>
        </div>
        {review.isSample && (
          <span className="ml-auto">
            <SampleBadge />
          </span>
        )}
      </div>
      <Stars rating={review.rating} className="mt-4 text-sm text-gold-600" />
      <blockquote className="mt-3 flex-1 text-[15.5px] leading-[1.85]">{review.text}</blockquote>
      <p className="text-ink-600 mt-4 text-xs">
        <time dateTime={review.date}>{dateFormat.format(new Date(review.date))}</time>
      </p>
    </figure>
  );
}
