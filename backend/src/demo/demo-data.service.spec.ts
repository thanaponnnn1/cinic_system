import { ForbiddenException } from '@nestjs/common';
import { ApptStatus } from '@clinicq/shared';
import { DemoDataService } from './demo-data.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ClockService } from '../clock/clock.service';
import type { ReminderSchedulerService } from '../reminders/reminder-scheduler.service';

const NOW = new Date('2026-10-24T06:10:00.000Z'); // 13:10 น. เวลาไทย
const DAY_MS = 86_400_000;

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  lastVisitAt: Date | null;
}

type UpdateManyArgs = {
  where: {
    id: string;
    OR: ({ lastVisitAt: null } | { lastVisitAt: { lt: Date } })[];
  };
  data: Partial<CustomerRow>;
};

/** ตีความ where เฉพาะรูปที่ service ใช้ รูปอื่นโยน error ให้เทสต์พังแทนที่จะผ่านแบบเงียบ ๆ */
function matches(row: CustomerRow, where: UpdateManyArgs['where']): boolean {
  if (Object.keys(where).some((k) => k !== 'id' && k !== 'OR')) {
    throw new Error(`where ที่ไม่รองรับ: ${JSON.stringify(where)}`);
  }
  if (row.id !== where.id) return false;
  return where.OR.some((cond) =>
    cond.lastVisitAt === null
      ? row.lastVisitAt === null
      : row.lastVisitAt !== null && row.lastVisitAt < cond.lastVisitAt.lt,
  );
}

describe('DemoDataService.reset', () => {
  const tx = {
    appointment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createManyAndReturn: jest.fn(),
    },
    waitlistEntry: { deleteMany: jest.fn() },
    messageLog: { deleteMany: jest.fn() },
    customer: { updateMany: jest.fn() },
  };
  let table: CustomerRow[] = [];
  const prisma = {
    provider: { findMany: jest.fn() },
    service: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const clock = { demoMode: true, now: () => NOW, reset: jest.fn() };
  const reminders = { sync: jest.fn(), cancel: jest.fn() };

  function build(): DemoDataService {
    return new DemoDataService(
      prisma as unknown as PrismaService,
      clock as unknown as ClockService,
      reminders as unknown as ReminderSchedulerService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    clock.demoMode = true;
    prisma.provider.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
    prisma.service.findMany.mockResolvedValue([
      { id: 's1', durationMin: 60 },
      { id: 's2', durationMin: 30 },
    ]);
    prisma.customer.findMany.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => ({ id: `c${i + 1}` })),
    );
    prisma.$transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx));
    tx.appointment.findMany.mockResolvedValue([{ id: 'old1' }, { id: 'old2' }]);
    tx.waitlistEntry.deleteMany.mockResolvedValue({ count: 1 });
    tx.messageLog.deleteMany.mockResolvedValue({ count: 3 });
    tx.appointment.deleteMany.mockResolvedValue({ count: 2 });
    table = [];
    tx.customer.updateMany.mockImplementation(({ where, data }: UpdateManyArgs) => {
      const hit = table.filter((row) => matches(row, where));
      for (const row of hit) Object.assign(row, data);
      return Promise.resolve({ count: hit.length });
    });
    tx.appointment.createManyAndReturn.mockImplementation(
      ({ data }: { data: { startsAt: Date; status: ApptStatus }[] }) =>
        Promise.resolve(
          data.map((a, i) => ({ id: `new${i}`, startsAt: a.startsAt, status: a.status })),
        ),
    );
  });

  it('ปิดโหมดเดโมอยู่ ตอบ 403 โดยไม่ลบอะไร ไม่แตะนาฬิกา และไม่แตะคิวงาน', async () => {
    clock.demoMode = false;

    await expect(build().reset()).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.appointment.deleteMany).not.toHaveBeenCalled();
    expect(clock.reset).not.toHaveBeenCalled();
    expect(reminders.cancel).not.toHaveBeenCalled();
    expect(reminders.sync).not.toHaveBeenCalled();
  });

  it('ลบเฉพาะบันทึกข้อความที่ผูกกับนัด — ข้อความแคมเปญและสรุปรายวันต้องอยู่ครบ', async () => {
    await build().reset();

    expect(tx.messageLog.deleteMany).toHaveBeenCalledWith({
      where: { appointmentId: { not: null } },
    });
  });

  it('คัดลูกค้าเฉพาะคนที่มาภายใน 90 วัน กลุ่มเป้าหมายแคมเปญดึงลูกค้ากลับจึงไม่ถูกใส่ในตาราง', async () => {
    await build().reset();

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.lastVisitAt.gte).toEqual(new Date(NOW.getTime() - 90 * 86_400_000));
  });

  it('ยกเลิกงานเตือนของนัดเก่าทุกใบ แล้วตั้งงานเตือนให้เฉพาะนัดที่ยังไม่ถึงและยังจอง/ยืนยันอยู่', async () => {
    const result = await build().reset();

    expect(reminders.cancel.mock.calls.map(([id]) => id)).toEqual(['old1', 'old2']);

    const created = tx.appointment.createManyAndReturn.mock.calls[0][0].data as {
      startsAt: Date;
      status: ApptStatus;
    }[];
    const expected = created
      .map((a, i) => ({ ...a, id: `new${i}` }))
      .filter(
        (a) =>
          a.startsAt > NOW && (a.status === ApptStatus.BOOKED || a.status === ApptStatus.CONFIRMED),
      );

    expect(expected.length).toBeGreaterThan(0);
    expect(reminders.sync.mock.calls).toEqual(expected.map((a) => [a.id, a.startsAt]));
    expect(result.remindersSynced).toBe(expected.length);
  });

  it('คืนนาฬิกาเป็นเวลาจริงก่อนวางตาราง และสรุปจำนวนที่ลบกับที่สร้าง', async () => {
    const result = await build().reset();

    expect(clock.reset.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
    expect(result.deleted).toEqual({ appointments: 2, waitlistEntries: 1, messageLogs: 3 });
    expect(result.created.total).toBe(
      Object.values(result.created.byStatus).reduce((sum, n) => sum + n, 0),
    );
  });

  describe('วันที่มาล่าสุดของลูกค้า', () => {
    const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS);
    const winBack = (rows: CustomerRow[]) =>
      rows.filter((r) => r.lastVisitAt !== null && r.lastVisitAt < daysAgo(90)).map((r) => r.id);
    const snapshot = () => table.map((r) => ({ ...r }));

    /** นัดเสร็จแล้วใบล่าสุดของแต่ละคน คิดจากข้อมูลที่ส่งเข้า createManyAndReturn จริง */
    function latestCompletedFromInsert(): Map<string, number> {
      const data = tx.appointment.createManyAndReturn.mock.calls[0][0].data as {
        customerId: string;
        startsAt: Date;
        status: ApptStatus;
      }[];
      const latest = new Map<string, number>();
      for (const a of data) {
        if (a.status !== ApptStatus.COMPLETED) continue;
        latest.set(a.customerId, Math.max(latest.get(a.customerId) ?? 0, a.startsAt.getTime()));
      }
      return latest;
    }

    beforeEach(() => {
      table = [
        // c1 ไม่เคยมีวันที่มาล่าสุด ส่วน c2 มีวันที่ที่ใหม่กว่านัดเสร็จแล้วทุกใบในตาราง
        { id: 'c1', name: 'หนึ่ง', phone: '0800000001', lastVisitAt: null },
        { id: 'c2', name: 'สอง', phone: '0800000002', lastVisitAt: NOW },
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `c${i + 3}`,
          name: `ลูกค้า ${i + 3}`,
          phone: `08000000${String(i + 3).padStart(2, '0')}`,
          lastVisitAt: daysAgo(60),
        })),
        // กลุ่มเป้าหมายแคมเปญดึงลูกค้ากลับ ไม่อยู่ในตารางเดโม
        { id: 'gone', name: 'หายไป', phone: '0800000099', lastVisitAt: daysAgo(200) },
      ];
    });

    it('ขยับไปเป็นนัดเสร็จแล้วใบล่าสุด ไม่ถอยวันที่ที่ใหม่กว่า และไม่แตะคนที่ไม่มีนัดเสร็จ', async () => {
      const before = snapshot();
      const result = await build().reset();
      const latest = latestCompletedFromInsert();

      expect(latest.has('c1')).toBe(true);
      expect(latest.has('c2')).toBe(true);
      expect(latest.get('c2')!).toBeLessThan(NOW.getTime());

      const expected = before.map((row) => {
        const start = latest.get(row.id);
        const advances =
          start !== undefined && (row.lastVisitAt === null || row.lastVisitAt.getTime() < start);
        return advances ? { ...row, lastVisitAt: new Date(start) } : row;
      });
      expect(table).toEqual(expected);
      expect(table.find((r) => r.id === 'c2')!.lastVisitAt).toEqual(NOW);
      expect(table.find((r) => r.id === 'gone')).toEqual(before.find((r) => r.id === 'gone'));

      const changed = table.filter((row, i) => row.lastVisitAt !== before[i].lastVisitAt);
      expect(result.lastVisitsAdvanced).toBe(changed.length);
      expect(changed.length).toBeGreaterThan(0);
    });

    it('แก้เฉพาะคอลัมน์ lastVisitAt ในธุรกรรมเดียวกับการสร้างนัด', async () => {
      await build().reset();

      expect(tx.customer.updateMany).toHaveBeenCalled();
      for (const [{ data }] of tx.customer.updateMany.mock.calls as [UpdateManyArgs][]) {
        expect(Object.keys(data)).toEqual(['lastVisitAt']);
      }
      expect(tx.customer.updateMany.mock.invocationCallOrder[0]).toBeGreaterThan(
        tx.appointment.createManyAndReturn.mock.invocationCallOrder[0],
      );
    });

    it('รีเซ็ตซ้ำได้ค่าเดิม และกลุ่มเป้าหมายแคมเปญดึงลูกค้ากลับเป็นชุดเดิมทุกครั้ง', async () => {
      const targetsBefore = winBack(table);

      await build().reset();
      const afterFirst = snapshot();
      const second = await build().reset();

      expect(table).toEqual(afterFirst);
      expect(second.lastVisitsAdvanced).toBe(0);
      expect(winBack(afterFirst)).toEqual(targetsBefore);
      expect(winBack(table)).toEqual(targetsBefore);
      expect(targetsBefore).toEqual(['gone']);
    });
  });
});
