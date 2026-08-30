import Image from 'next/image';
import { BRAND_INFO, GOLD, NAVY, STATUS_COLOR, APPT_STATUS_LABEL } from '@clinicq/shared';
import { ApiStatus } from '@/components/api-status';

/** ความคืบหน้าของโปรเจกต์ตาม docs/plan-clinic-demo.md */
const PHASES = [
  { no: 0, name: 'วางราก', detail: 'monorepo · docker · prisma · lint', done: true },
  {
    no: 1,
    name: 'Auth + CRUD ฐาน',
    detail: 'สิทธิ์ 3 ระดับ · ลูกค้า · ช่าง · บริการ',
    done: true,
  },
  {
    no: 2,
    name: 'Appointment Engine',
    detail: 'ตารางนัด · state machine · กันจองซ้อน',
    done: false,
  },
  {
    no: 3,
    name: 'LINE Integration',
    detail: 'ผูกบัญชี · Flex · ปุ่มยืนยัน/เลื่อนนัด',
    done: false,
  },
  { no: 4, name: 'เตือนนัดอัตโนมัติ', detail: 'ล่วงหน้า 1 วัน และก่อน 2 ชั่วโมง', done: false },
  { no: 5, name: 'คิวว่าง', detail: 'ยกเลิกแล้วส่งคิวให้คนที่รออยู่ทันที', done: false },
  {
    no: 6,
    name: 'ดึงลูกค้ากลับ + คอร์ส',
    detail: 'ตามลูกค้าที่หาย · เตือนคอร์สใกล้หมดอายุ',
    done: false,
  },
  { no: 7, name: 'Dashboard', detail: 'บอร์ดคิว · ปฏิทิน · สรุปรายวัน', done: false },
  { no: 8, name: 'ขึ้นระบบจริง', detail: 'deploy · แจ้งเตือนเมื่อระบบตัวเองพัง', done: false },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-12 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <Image
          src="/brand/logo.jpg"
          alt={`โลโก้ ${BRAND_INFO.fullName}`}
          width={200}
          height={109}
          priority
          className="rounded-lg border border-navy-600"
        />
        <div>
          <h1 className="text-gold-gradient font-display text-3xl tracking-wide sm:text-4xl">
            {BRAND_INFO.productName}
          </h1>
          <p className="mt-1 text-sm tracking-[0.2em] text-gold-500 uppercase">{BRAND_INFO.name}</p>
          <p className="mt-3 text-gold-200/80">{BRAND_INFO.tagline}</p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ApiStatus />

        <section className="rounded-xl border border-navy-600 bg-navy-900/60 p-6">
          <h2 className="mb-5 font-display text-lg text-gold-200">สีประจำแบรนด์</h2>
          <p className="mb-4 text-xs text-gold-300/60">
            ทุกค่าสุ่มวัดจากไฟล์โลโก้จริง ใช้ร่วมกันทั้งหน้าจอและข้อความใน LINE
          </p>
          <div className="space-y-4">
            <Swatches
              label="ทอง"
              entries={[
                ['100', GOLD[100]],
                ['300', GOLD[300]],
                ['400', GOLD[400]],
                ['600', GOLD[600]],
                ['700', GOLD[700]],
              ]}
            />
            <Swatches
              label="กรมท่า"
              entries={[
                ['950', NAVY[950]],
                ['800', NAVY[800]],
                ['700', NAVY[700]],
                ['600', NAVY[600]],
                ['400', NAVY[400]],
              ]}
            />
          </div>
        </section>

        <section className="rounded-xl border border-navy-600 bg-navy-900/60 p-6">
          <h2 className="mb-5 font-display text-lg text-gold-200">สถานะนัด</h2>
          <ul className="space-y-2.5 text-sm">
            {Object.entries(STATUS_COLOR).map(([status, color]) => (
              <li key={status} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gold-200/90">
                  {APPT_STATUS_LABEL[status as keyof typeof APPT_STATUS_LABEL]}
                </span>
                <span className="ml-auto font-mono text-xs text-gold-300/50">{color}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-navy-600 bg-navy-900/60 p-6">
          <h2 className="mb-5 font-display text-lg text-gold-200">ความคืบหน้า</h2>
          <ol className="space-y-2.5 text-sm">
            {PHASES.map((phase) => (
              <li key={phase.no} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    phase.done
                      ? 'bg-gold-400 font-semibold text-navy-950'
                      : 'border border-navy-500 text-gold-300/40'
                  }`}
                >
                  {phase.done ? '✓' : phase.no}
                </span>
                <span className="min-w-0">
                  <span className={phase.done ? 'text-gold-200' : 'text-gold-300/50'}>
                    {phase.name}
                  </span>
                  <span className="block text-xs text-gold-300/40">{phase.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="mt-12 border-t border-navy-700 pt-6 text-xs text-gold-300/40">
        <p>หน้านี้เป็นหน้าตรวจสถานะของ Phase 0 — บอร์ดคิวและหน้าจอใช้งานจริงจะมาใน Phase 7</p>
        <p className="mt-1">
          เขตเวลา {BRAND_INFO.timezone} · เอกสารแผนงานอยู่ที่ docs/plan-clinic-demo.md
        </p>
      </footer>
    </main>
  );
}

function Swatches({ label, entries }: { label: string; entries: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 text-xs text-gold-300/70">{label}</p>
      <div className="flex gap-2">
        {entries.map(([name, hex]) => (
          <div key={name} className="flex-1">
            <div
              className="h-10 rounded border border-navy-600"
              style={{ backgroundColor: hex }}
              title={hex}
            />
            <p className="mt-1 text-center font-mono text-[10px] text-gold-300/50">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
