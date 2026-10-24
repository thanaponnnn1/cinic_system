import { ApptStatus, formatBangkokDate, formatBangkokTime } from '@clinicq/shared';
import {
  buildDemoSchedule,
  latestCompletedStartByCustomer,
  type DemoAppointmentPlan,
  type DemoScheduleInput,
} from './demo-schedule';
import { MAX_UPCOMING_BOOKINGS } from '../customer-portal/customer-portal.service';

const bkk = (local: string): Date => new Date(`${local}:00+07:00`);
const DAY_MS = 86_400_000;

const INPUT: Omit<DemoScheduleInput, 'now'> = {
  providers: [{ id: 'nan' }, { id: 'best' }, { id: 'fah' }],
  services: [
    { id: 'facial', durationMin: 60 },
    { id: 'cleanse', durationMin: 45 },
    { id: 'massage', durationMin: 30 },
    { id: 'eye', durationMin: 30 },
    { id: 'hair', durationMin: 90 },
    { id: 'wash', durationMin: 45 },
    { id: 'cut', durationMin: 60 },
    { id: 'consult', durationMin: 30 },
  ],
  customerIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'],
};

/** เวลาที่คนเดโมอาจกดรีเซ็ต: ก่อนร้านเปิด กลางวัน คร่อมช่อง ตรงขอบช่อง และหลังร้านปิด */
const NOWS = [
  bkk('2026-10-24T08:15'),
  bkk('2026-10-24T13:10'),
  bkk('2026-10-24T15:00'),
  bkk('2026-10-24T19:45'),
  bkk('2026-10-24T22:30'),
];

const PAST = new Set<ApptStatus>([ApptStatus.COMPLETED, ApptStatus.NO_SHOW, ApptStatus.CANCELLED]);
const FUTURE = new Set<ApptStatus>([
  ApptStatus.BOOKED,
  ApptStatus.CONFIRMED,
  ApptStatus.RESCHEDULE_REQUESTED,
]);

const build = (now: Date) => buildDemoSchedule({ ...INPUT, now });
const dayOf = (a: DemoAppointmentPlan) => formatBangkokDate(a.startsAt);
const shiftDate = (now: Date, days: number) =>
  formatBangkokDate(new Date(now.getTime() + days * DAY_MS));

describe.each(NOWS.map((now) => [formatBangkokTime(now), now] as const))(
  'buildDemoSchedule ตอน %s น.',
  (_label, now) => {
    const plan = build(now);

    it('ช่างคนเดียวกันไม่มีนัดซ้อนกันเลย ไม่ว่าสถานะไหน', () => {
      const byProvider = new Map<string, DemoAppointmentPlan[]>();
      for (const a of plan)
        byProvider.set(a.providerId, [...(byProvider.get(a.providerId) ?? []), a]);

      for (const list of byProvider.values()) {
        const sorted = [...list].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
        for (let i = 1; i < sorted.length; i += 1) {
          expect(sorted[i].startsAt.getTime()).toBeGreaterThanOrEqual(
            sorted[i - 1].endsAt.getTime(),
          );
        }
      }
    });

    it('ลูกค้าคนเดียวกันไม่ถูกนัดสองที่ในเวลาเดียวกัน', () => {
      for (const a of plan) {
        const clash = plan.find(
          (b) =>
            b !== a &&
            b.customerId === a.customerId &&
            b.startsAt < a.endsAt &&
            a.startsAt < b.endsAt,
        );
        expect(clash).toBeUndefined();
      }
    });

    it('ทุกนัดอยู่ในเวลาเปิดร้าน 10:00–20:00 ตรงช่องละ 30 นาที และจบก่อนร้านปิด', () => {
      for (const a of plan) {
        const start = formatBangkokTime(a.startsAt);
        const end = formatBangkokTime(a.endsAt);

        expect(start >= '10:00').toBe(true);
        expect(end <= '20:00').toBe(true);
        expect(formatBangkokDate(a.endsAt)).toBe(dayOf(a));
        expect(['00', '30']).toContain(start.slice(3));
        expect(a.startsAt.getUTCSeconds()).toBe(0);
        expect(a.endsAt.getTime()).toBeGreaterThan(a.startsAt.getTime());
      }
    });

    it('สถานะตามเวลา: จบไปแล้วคือเสร็จ/ไม่มา/ยกเลิก ยังไม่เริ่มคือจอง/ยืนยัน/ขอเลื่อน ไม่มีนัดคร่อมเวลาปัจจุบัน', () => {
      for (const a of plan) {
        if (a.endsAt.getTime() <= now.getTime()) expect(PAST.has(a.status)).toBe(true);
        else if (a.startsAt.getTime() >= now.getTime()) expect(FUTURE.has(a.status)).toBe(true);
        else throw new Error(`นัด ${a.startsAt.toISOString()} คร่อมเวลาปัจจุบัน`);
      }
    });

    it('วันนี้มีอย่างน้อย 4 นัด และพรุ่งนี้มีคิวรออย่างน้อย 6 ใบ', () => {
      const today = plan.filter((a) => dayOf(a) === shiftDate(now, 0));
      const tomorrow = plan.filter((a) => dayOf(a) === shiftDate(now, 1) && FUTURE.has(a.status));

      expect(today.length).toBeGreaterThanOrEqual(4);
      expect(tomorrow.length).toBeGreaterThanOrEqual(6);
    });

    it('ลูกค้าทุกคนยังจองเองจากหน้าลูกค้าได้อีกอย่างน้อยหนึ่งนัด', () => {
      const holding = new Map<string, number>();
      for (const a of plan) {
        if (a.startsAt <= now) continue;
        if (a.status !== ApptStatus.BOOKED && a.status !== ApptStatus.CONFIRMED) continue;
        holding.set(a.customerId, (holding.get(a.customerId) ?? 0) + 1);
      }

      for (const count of holding.values()) {
        expect(count).toBeLessThan(MAX_UPCOMING_BOOKINGS);
      }
    });

    it('ใช้เฉพาะลูกค้า ช่าง และบริการที่ส่งเข้ามา', () => {
      for (const a of plan) {
        expect(INPUT.customerIds).toContain(a.customerId);
        expect(INPUT.providers.map((p) => p.id)).toContain(a.providerId);
        expect(INPUT.services.map((s) => s.id)).toContain(a.serviceId);
      }
    });
  },
);

describe('buildDemoSchedule — ประวัติย้อนหลังและแนวโน้ม', () => {
  const now = bkk('2026-10-24T13:10');
  const plan = build(now);
  const history = Array.from({ length: 14 }, (_, i) => {
    const date = shiftDate(now, i - 14);
    return plan.filter((a) => dayOf(a) === date);
  });
  const rate = (days: DemoAppointmentPlan[][]) => {
    const all = days.flat().filter((a) => a.status !== ApptStatus.CANCELLED);
    return all.filter((a) => a.status === ApptStatus.NO_SHOW).length / all.length;
  };

  it('ย้อนหลัง 14 วัน วันละราว 10 นัด และทุกนัดผ่านไปแล้ว', () => {
    for (const day of history) {
      expect(day.length).toBeGreaterThanOrEqual(9);
      expect(day.length).toBeLessThanOrEqual(11);
      expect(day.every((a) => PAST.has(a.status))).toBe(true);
    }
  });

  it('อัตราไม่มาตามนัดลดจากราว 15% ช่วงแรกเหลือราว 5% ช่วงหลัง', () => {
    const oldest = rate(history.slice(0, 4));
    const newest = rate(history.slice(-4));

    expect(oldest).toBeGreaterThanOrEqual(0.1);
    expect(oldest).toBeLessThanOrEqual(0.2);
    expect(newest).toBeLessThanOrEqual(0.08);
    expect(rate(history.slice(0, 7))).toBeGreaterThan(rate(history.slice(7)));
  });

  it('นัดไม่มารายวันไม่เพิ่มขึ้นเลยตลอด 14 วัน และวันท้าย ๆ ลงไปถึงศูนย์ — กราฟ 7 วันเห็นเส้นลง', () => {
    const daily = history.map((day) => day.filter((a) => a.status === ApptStatus.NO_SHOW).length);

    for (let i = 1; i < daily.length; i += 1) {
      expect(daily[i]).toBeLessThanOrEqual(daily[i - 1]);
    }
    expect(daily[0]).toBeGreaterThan(daily.at(-1)!);
    expect(daily.at(-1)).toBe(0);
  });

  it('มีนัดยกเลิกในประวัติ 2–3 ใบ และไม่มีในวันนี้หรือวันข้างหน้า', () => {
    const cancelled = plan.filter((a) => a.status === ApptStatus.CANCELLED);

    expect(cancelled.length).toBeGreaterThanOrEqual(2);
    expect(cancelled.length).toBeLessThanOrEqual(3);
    for (const a of cancelled) expect(dayOf(a) < shiftDate(now, 0)).toBe(true);
  });

  it('คิวที่ยังไม่ถึงมีครบทั้งจอง ยืนยัน และขอเลื่อน', () => {
    const statuses = new Set(plan.filter((a) => FUTURE.has(a.status)).map((a) => a.status));

    expect(statuses).toEqual(FUTURE);
  });
});

describe('buildDemoSchedule — ความแน่นอนของผลลัพธ์', () => {
  it('ข้อมูลเข้าเหมือนเดิมได้ตารางเดิมทุกครั้ง', () => {
    const now = bkk('2026-10-24T13:10');

    expect(build(now)).toEqual(build(now));
  });

  it('ไม่แตะ Math.random หรือ Date.now เลย', () => {
    const random = jest.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('ห้ามใช้ Math.random');
    });
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('ห้ามใช้ Date.now');
    });

    try {
      expect(build(bkk('2026-10-24T13:10')).length).toBeGreaterThan(0);
    } finally {
      random.mockRestore();
      clock.mockRestore();
    }
  });

  it('รีเซ็ตซ้ำในวันเดียวกันได้หน้าตาเดิม ต่างแค่นัดที่ผ่านเวลาไปแล้ว', () => {
    const morning = build(bkk('2026-10-24T08:15'));
    const later = build(bkk('2026-10-24T08:45'));
    const key = (a: DemoAppointmentPlan) =>
      `${a.providerId}|${a.startsAt.toISOString()}|${a.customerId}`;

    expect(later.map(key)).toEqual(morning.map(key));
  });

  it('ลูกค้าน้อยกว่าช่าง ก็ยังไม่มีใครถูกนัดสองที่ในเวลาเดียวกัน', () => {
    const plan = buildDemoSchedule({
      ...INPUT,
      now: bkk('2026-10-24T13:10'),
      customerIds: ['c1', 'c2'],
    });

    expect(plan.length).toBeGreaterThan(0);
    for (const a of plan) {
      const clash = plan.find(
        (b) =>
          b !== a &&
          b.customerId === a.customerId &&
          b.startsAt < a.endsAt &&
          a.startsAt < b.endsAt,
      );
      expect(clash).toBeUndefined();
    }
  });

  it('ไม่มีลูกค้า ช่าง หรือบริการ แจ้งเหตุผลแทนที่จะคืนตารางว่าง', () => {
    const now = bkk('2026-10-24T13:10');

    expect(() => buildDemoSchedule({ ...INPUT, now, customerIds: [] })).toThrow('90 วัน');
    expect(() => buildDemoSchedule({ ...INPUT, now, providers: [] })).toThrow('ช่าง');
    expect(() => buildDemoSchedule({ ...INPUT, now, services: [] })).toThrow('บริการ');
  });
});

describe('latestCompletedStartByCustomer', () => {
  const at = (local: string) => bkk(`2026-10-${local}`);

  it('เลือกนัดเสร็จแล้วใบที่เริ่มช้าสุด ไม่ว่าลำดับในตารางเป็นแบบไหน', () => {
    const latest = latestCompletedStartByCustomer([
      { customerId: 'c1', startsAt: at('22T14:00'), status: ApptStatus.COMPLETED },
      { customerId: 'c1', startsAt: at('23T10:00'), status: ApptStatus.COMPLETED },
      { customerId: 'c1', startsAt: at('20T09:00'), status: ApptStatus.COMPLETED },
      { customerId: 'c3', startsAt: at('21T11:30'), status: ApptStatus.COMPLETED },
    ]);

    expect(latest).toEqual(
      new Map([
        ['c1', at('23T10:00')],
        ['c3', at('21T11:30')],
      ]),
    );
  });

  it('นัดที่ไม่มา ยกเลิก หรือยังไม่ถึง ไม่นับเป็นการมาใช้บริการ', () => {
    const latest = latestCompletedStartByCustomer([
      { customerId: 'c1', startsAt: at('20T09:00'), status: ApptStatus.COMPLETED },
      { customerId: 'c1', startsAt: at('23T09:00'), status: ApptStatus.NO_SHOW },
      { customerId: 'c2', startsAt: at('22T09:00'), status: ApptStatus.CANCELLED },
      { customerId: 'c2', startsAt: at('25T09:00'), status: ApptStatus.CONFIRMED },
      { customerId: 'c2', startsAt: at('26T09:00'), status: ApptStatus.BOOKED },
    ]);

    expect(latest).toEqual(new Map([['c1', at('20T09:00')]]));
  });

  it.each(NOWS.map((now) => [formatBangkokTime(now), now] as const))(
    'บนตารางเดโมจริงตอน %s น. ทุกค่าคือนัดเสร็จแล้วใบล่าสุดของคนนั้น และไม่เลยเวลาปัจจุบัน',
    (_label, now) => {
      const plan = build(now);
      const latest = latestCompletedStartByCustomer(plan);

      expect(latest.size).toBeGreaterThan(0);
      for (const id of INPUT.customerIds) {
        const starts = plan
          .filter((a) => a.customerId === id && a.status === ApptStatus.COMPLETED)
          .map((a) => a.startsAt.getTime());
        expect(latest.get(id)?.getTime()).toBe(starts.length ? Math.max(...starts) : undefined);
        if (starts.length) expect(latest.get(id)!.getTime()).toBeLessThan(now.getTime());
      }
    },
  );
});
