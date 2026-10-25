import { Container } from '@/components/ui';
import { content, ratingSummary, yearsOpen } from '@/content/load';
import { Counter } from '@/effects/counter';
import { GlBackdrop } from '@/effects/gl/gl-backdrop';

export function Metrics() {
  const sample = ratingSummary.allSamples;
  const stats = [
    { value: yearsOpen, decimals: 0, label: 'ปีที่เปิดให้บริการ' },
    {
      value: ratingSummary.count,
      decimals: 0,
      label: sample ? 'รีวิว (ตัวอย่าง)' : 'รีวิวจากลูกค้า',
    },
    {
      value: Number(ratingSummary.average.toFixed(1)),
      decimals: 1,
      label: sample ? 'คะแนนเฉลี่ย (ตัวอย่าง)' : 'คะแนนเฉลี่ยจาก 5',
    },
    { value: content.services.length, decimals: 0, label: 'บริการผิวหน้าและเส้นผม' },
  ];

  return (
    <section
      aria-label="ตัวเลขของร้าน"
      className="relative isolate overflow-hidden bg-navy-900 py-20 text-gold-100 lg:py-24"
    >
      <GlBackdrop preset="amber-cells" className="-z-10" />
      <Container>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse border-l border-gold-300/20 pl-6"
            >
              <dt className="mt-3 text-[15px] text-gold-100/70">{stat.label}</dt>
              <dd className="text-gold-gradient font-display text-6xl leading-none lg:text-7xl">
                <Counter value={stat.value} decimals={stat.decimals} />
              </dd>
            </div>
          ))}
        </dl>
        {sample && (
          <p className="mt-12 text-sm text-gold-100/70">
            จำนวนรีวิวและคะแนนเฉลี่ยคำนวณจากรีวิวตัวอย่างของเว็บเดโม ไม่ใช่รีวิวจริง
          </p>
        )}
      </Container>
    </section>
  );
}
