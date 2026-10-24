import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiErrorCode, ApptStatus } from '@clinicq/shared';
import { AppointmentsService } from '../appointments/appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderSchedulerService } from '../reminders/reminder-scheduler.service';
import { WaitlistQueueService } from '../waitlist/waitlist-queue.service';
import { CampaignAttributionService } from '../campaigns/campaign-attribution.service';
import { ClockService } from '../clock/clock.service';
import { CustomerPortalService } from './customer-portal.service';

/**
 * ใช้ AppointmentsService ตัวจริงทั้งก้อน แทนฐานข้อมูลด้วย mock ของ Prisma
 *
 * เหตุผล: สิ่งที่ต้องพิสูจน์คือพฤติกรรมที่ลูกค้าเห็นจริงเมื่อวิ่งผ่านระบบนัดเดิม —
 * ช่องชนแล้วไปช่างคนถัดไป ข้อความของระบบนัดไม่หลุดชื่อลูกค้าอื่น และนัดของคนอื่นไม่ถูกแตะ
 */

/** เสาร์ 24 ต.ค. 2569 09:00 น. เวลาไทย */
const NOW = new Date('2026-10-24T02:00:00.000Z');
const bkk = (local: string): Date => new Date(`${local}:00+07:00`);
const TOMORROW_10 = '2026-10-25T10:00:00+07:00';

const FACIAL = {
  id: 'svc_facial',
  name: 'ทรีตเมนต์บำรุงผิวหน้า',
  durationMin: 60,
  price: { toString: () => '1500' },
  isActive: true,
};

const PROVIDERS: Record<string, { id: string; name: string; isActive: boolean }> = {
  prov_best: { id: 'prov_best', name: 'คุณเบส', isActive: true },
  prov_nan: { id: 'prov_nan', name: 'คุณแนน', isActive: true },
};

/** ลูกค้าอีกคนที่ถือช่องที่ชนอยู่ — ชื่อนี้ต้องไม่หลุดไปถึงหน้าลูกค้า A */
const OTHER_CUSTOMER_NAME = 'มาลี รุ่งเรือง';

describe('CustomerPortalService', () => {
  let portal: CustomerPortalService;

  /** ช่างที่ช่อง TOMORROW_10 ถูกจองไปแล้ว */
  let takenBy: Set<string>;

  const db = {
    service: { findUnique: jest.fn() },
    provider: { findUnique: jest.fn(), findMany: jest.fn() },
    customer: { findUnique: jest.fn() },
    customerCourse: { findUnique: jest.fn(), findMany: jest.fn() },
    appointment: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const reminders = { sync: jest.fn(), cancel: jest.fn() };
  const waitlistQueue = { publishOpenSlot: jest.fn() };

  beforeEach(async () => {
    takenBy = new Set();

    const allMocks = [
      ...Object.values(db.appointment),
      ...Object.values(db.provider),
      ...Object.values(db.customerCourse),
      db.service.findUnique,
      db.customer.findUnique,
      db.$executeRaw,
      db.$transaction,
      reminders.sync,
      reminders.cancel,
      waitlistQueue.publishOpenSlot,
    ];
    allMocks.forEach((fn) => fn.mockReset());

    // ธุรกรรมของระบบนัดใช้ mock ชุดเดียวกับข้างนอก — พอสำหรับดูว่าเขียนอะไรลงไปบ้าง
    db.$transaction.mockImplementation((work: (tx: typeof db) => unknown) => work(db));
    db.service.findUnique.mockResolvedValue(FACIAL);
    db.customer.findUnique.mockResolvedValue({ id: 'cus_a', name: 'สมหญิง', isActive: true });
    db.provider.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(PROVIDERS[where.id] ?? null),
    );
    db.provider.findMany.mockResolvedValue([{ id: 'prov_best' }, { id: 'prov_nan' }]);
    db.appointment.count.mockResolvedValue(0);
    db.appointment.findFirst.mockImplementation(({ where }: { where: { providerId: string } }) =>
      Promise.resolve(
        takenBy.has(where.providerId)
          ? {
              startsAt: bkk('2026-10-25T10:00'),
              endsAt: bkk('2026-10-25T11:00'),
              customer: { name: OTHER_CUSTOMER_NAME },
              provider: { name: PROVIDERS[where.providerId]?.name },
            }
          : null,
      ),
    );
    db.appointment.create.mockImplementation(
      ({
        data,
      }: {
        data: { customerId: string; providerId: string; startsAt: Date; endsAt: Date };
      }) =>
        Promise.resolve({
          id: 'appt_new',
          ...data,
          status: ApptStatus.BOOKED,
          cancelReason: null,
          createdAt: NOW,
          customer: { id: data.customerId, name: 'สมหญิง', phone: '0810000001', lineUserId: null },
          provider: { id: data.providerId, name: PROVIDERS[data.providerId]?.name },
          service: FACIAL,
        }),
    );

    const module = await Test.createTestingModule({
      providers: [
        CustomerPortalService,
        AppointmentsService,
        { provide: PrismaService, useValue: db },
        { provide: ReminderSchedulerService, useValue: reminders },
        { provide: WaitlistQueueService, useValue: waitlistQueue },
        {
          provide: CampaignAttributionService,
          useValue: { stampReturn: jest.fn(), stampRevenue: jest.fn() },
        },
        { provide: ClockService, useValue: { now: () => NOW, demoMode: true } },
      ],
    }).compile();

    portal = module.get(CustomerPortalService);
  });

  const createdData = () =>
    (db.appointment.create.mock.calls as [{ data: Record<string, unknown> }][]).map(
      ([arg]) => arg.data,
    );

  describe('จองคิว', () => {
    it('ไม่ระบุช่างแล้วช่างคนแรกติดคิว ระบบไปจองกับช่างคนถัดไปให้', async () => {
      takenBy.add('prov_best');

      const appt = await portal.book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 });

      expect(appt.providerName).toBe('คุณแนน');
      expect(createdData()).toEqual([
        expect.objectContaining({ customerId: 'cus_a', providerId: 'prov_nan', createdById: null }),
      ]);
    });

    it('นัดที่จองได้คืนเป็นมุมมองลูกค้า มีปุ่มที่กดได้ และไม่มีเบอร์โทร', async () => {
      const appt = await portal.book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 });

      expect(appt).toMatchObject({
        status: ApptStatus.BOOKED,
        serviceName: FACIAL.name,
        price: 1500,
        actions: { confirm: true, requestReschedule: true, cancel: true },
      });
      expect(JSON.stringify(appt)).not.toContain('0810000001');
    });

    it('ช่างทุกคนติดคิวได้ 409 SLOT_TAKEN ไม่สร้างนัด และไม่บอกว่าใครจองช่องนั้นอยู่', async () => {
      takenBy.add('prov_best').add('prov_nan');

      const error = await portal
        .book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      const body = (error as ConflictException).getResponse();
      expect(body).toMatchObject({ error: ApiErrorCode.SLOT_TAKEN });
      expect(JSON.stringify(body)).not.toContain(OTHER_CUSTOMER_NAME);
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it('ระบุช่างที่ติดคิว ได้ 409 โดยไม่แอบย้ายไปช่างคนอื่น และไม่หลุดชื่อลูกค้าอื่น', async () => {
      takenBy.add('prov_best');

      const error = await portal
        .book('cus_a', { serviceId: FACIAL.id, providerId: 'prov_best', startsAt: TOMORROW_10 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect(JSON.stringify((error as ConflictException).getResponse())).not.toContain(
        OTHER_CUSTOMER_NAME,
      );
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it.each([
      ['ก่อนร้านเปิด', '2026-10-25T08:00:00+07:00'],
      ['นัดจบเลยเวลาปิด', '2026-10-25T19:30:00+07:00'],
      ['ไม่ตรงช่อง 30 นาที', '2026-10-25T10:10:00+07:00'],
      ['ไม่ทันเวลาจองล่วงหน้า', '2026-10-24T09:30:00+07:00'],
    ])(
      'ยิงเวลาที่หน้าจอไม่มีให้เลือกมาเอง (%s) ได้ 400 และไม่สร้างนัด',
      async (_label, startsAt) => {
        await expect(
          portal.book('cus_a', { serviceId: FACIAL.id, startsAt }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(db.appointment.create).not.toHaveBeenCalled();
      },
    );

    it('บริการที่ปิดไปแล้วจองไม่ได้', async () => {
      db.service.findUnique.mockResolvedValue({ ...FACIAL, isActive: false });

      await expect(
        portal.book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('จำกัดนัดที่ยังไม่ถึงเวลาไว้ 3 นัดต่อคน', () => {
    it('ถือครบ 3 นัดแล้วได้ 409 BOOKING_LIMIT_REACHED และไม่สร้างนัด', async () => {
      db.appointment.count.mockResolvedValue(3);

      const error = await portal
        .book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        error: ApiErrorCode.BOOKING_LIMIT_REACHED,
      });
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it('นับเฉพาะนัดของตัวเองที่ยังไม่ถึงเวลาและยังมีผล', async () => {
      db.appointment.count.mockResolvedValue(2);

      await portal.book('cus_a', { serviceId: FACIAL.id, startsAt: TOMORROW_10 });

      expect(db.appointment.count).toHaveBeenCalledWith({
        where: {
          customerId: 'cus_a',
          status: { in: [ApptStatus.BOOKED, ApptStatus.CONFIRMED] },
          startsAt: { gt: NOW },
        },
      });
      expect(db.appointment.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('จองโดยใช้คอร์ส', () => {
    const course = (overrides: Record<string, unknown> = {}) => ({
      id: 'course_1',
      customerId: 'cus_a',
      usedSessions: 2,
      expiresAt: new Date(NOW.getTime() + 60 * 86_400_000),
      package: { name: 'คอร์สผิวหน้า 10 ครั้ง', totalSessions: 10, serviceId: FACIAL.id },
      ...overrides,
    });

    const bookWithCourse = () =>
      portal.book('cus_a', {
        serviceId: FACIAL.id,
        startsAt: TOMORROW_10,
        customerCourseId: 'course_1',
      });

    it.each([
      ['หมดอายุแล้ว', course({ expiresAt: new Date(NOW.getTime() - 86_400_000) })],
      ['ใช้ครบแล้ว', course({ usedSessions: 10 })],
      [
        'ผูกกับบริการอื่น',
        course({ package: { name: 'คอร์สผม', totalSessions: 6, serviceId: 'svc_hair' } }),
      ],
      ['เป็นของลูกค้าคนอื่น', course({ customerId: 'cus_b' })],
      ['ไม่มีอยู่จริง', null],
    ])('คอร์สที่%s ได้ 400 และไม่สร้างนัด', async (_label, row) => {
      db.customerCourse.findUnique.mockResolvedValue(row);

      await expect(bookWithCourse()).rejects.toBeInstanceOf(BadRequestException);
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it('ครั้งที่เหลือถูกจองไว้ครบแล้วด้วยนัดที่ยังไม่ปิดงาน ได้ 400 — กันไปพังตอนปิดงานที่เคาน์เตอร์', async () => {
      db.customerCourse.findUnique.mockResolvedValue(course({ usedSessions: 8 }));
      db.appointment.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

      await expect(bookWithCourse()).rejects.toBeInstanceOf(BadRequestException);
      expect(db.appointment.create).not.toHaveBeenCalled();
    });

    it('คอร์สของตัวเองที่ยังใช้ได้ ถูกผูกไปกับนัดที่สร้าง', async () => {
      db.customerCourse.findUnique.mockResolvedValue(course());

      await bookWithCourse();

      expect(createdData()).toEqual([expect.objectContaining({ customerCourseId: 'course_1' })]);
    });

    it('คอร์สที่แม่แบบไม่ผูกบริการ ใช้กับบริการไหนก็ได้', async () => {
      db.customerCourse.findUnique.mockResolvedValue(
        course({ package: { name: 'คอร์สรวม', totalSessions: 10, serviceId: null } }),
      );

      await bookWithCourse();

      expect(db.appointment.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('ช่องเวลาที่จองได้', () => {
    beforeEach(() => {
      // คุณเบสติดคิว 10:00–12:00 ส่วนคุณแนนว่างทั้งวัน
      db.appointment.findMany.mockImplementation(({ where }: { where: { providerId: string } }) =>
        Promise.resolve(
          where.providerId === 'prov_best'
            ? [{ startsAt: bkk('2026-10-25T10:00'), endsAt: bkk('2026-10-25T12:00') }]
            : [],
        ),
      );
    });

    it('ไม่ระบุช่าง รวมช่องว่างของทุกคน ช่องที่ว่างหลายคนขึ้นครั้งเดียว และอยู่ในเวลาร้านเท่านั้น', async () => {
      const slots = await portal.availability({ serviceId: FACIAL.id, date: '2026-10-25' });
      const starts = slots.map((s) => s.startsAt.getTime());

      // บริการ 60 นาที: 10:00 ถึง 19:00 ทุก 30 นาที = 19 ช่อง
      expect(slots).toHaveLength(19);
      expect(new Set(starts).size).toBe(starts.length);
      expect(slots[0]?.startsAt).toEqual(bkk('2026-10-25T10:00'));
      expect(slots.at(-1)?.endsAt).toEqual(bkk('2026-10-25T20:00'));
      expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    });

    it('ระบุช่าง เห็นเฉพาะช่องที่ช่างคนนั้นว่าง', async () => {
      const slots = await portal.availability({
        serviceId: FACIAL.id,
        providerId: 'prov_best',
        date: '2026-10-25',
      });

      expect(slots[0]?.startsAt).toEqual(bkk('2026-10-25T12:00'));
      expect(slots).toHaveLength(15);
    });

    it('ช่างที่ปิดรับคิวแล้วได้ 404', async () => {
      db.provider.findUnique.mockResolvedValue({ id: 'prov_best', isActive: false });

      await expect(
        portal.availability({ serviceId: FACIAL.id, providerId: 'prov_best', date: '2026-10-25' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ปุ่มในหน้านัดของฉัน', () => {
    interface Row {
      id: string;
      customerId: string;
      providerId: string;
      status: ApptStatus;
      startsAt: Date;
      endsAt: Date;
    }

    /** ตารางนัดในหน่วยความจำ — mock ของ Prisma อ่านและเขียนที่นี่ จะได้ดูได้ว่าแถวไหนเปลี่ยนจริง */
    let rows: Map<string, Row>;

    const view = (row: Row) => ({
      ...row,
      serviceId: FACIAL.id,
      cancelReason: null,
      customerCourseId: null,
      createdAt: NOW,
      customer: { id: row.customerId, name: 'ลูกค้า', phone: '0810000002', lineUserId: null },
      provider: { id: row.providerId, name: PROVIDERS[row.providerId]?.name ?? '' },
      service: FACIAL,
    });

    const appointmentRow = (id: string, customerId: string, overrides: Partial<Row> = {}): Row => ({
      id,
      customerId,
      providerId: 'prov_nan',
      status: ApptStatus.BOOKED,
      startsAt: bkk('2026-10-25T14:00'),
      endsAt: bkk('2026-10-25T15:00'),
      ...overrides,
    });

    const snapshot = () => [...rows.values()].map((row) => ({ ...row }));

    beforeEach(() => {
      rows = new Map(
        [appointmentRow('appt_a', 'cus_a'), appointmentRow('appt_b', 'cus_b')].map((r) => [
          r.id,
          r,
        ]),
      );

      db.appointment.findFirst.mockImplementation(
        ({ where }: { where: { id: string; customerId: string } }) => {
          const row = rows.get(where.id);
          return Promise.resolve(row && row.customerId === where.customerId ? view(row) : null);
        },
      );
      db.appointment.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        const row = rows.get(where.id);
        return Promise.resolve(row ? view(row) : null);
      });
      db.appointment.updateMany.mockImplementation(
        ({
          where,
          data,
        }: {
          where: { id: string; status: ApptStatus };
          data: { status: ApptStatus };
        }) => {
          const row = rows.get(where.id);
          if (!row || row.status !== where.status) return Promise.resolve({ count: 0 });
          row.status = data.status;
          return Promise.resolve({ count: 1 });
        },
      );
      db.appointment.update.mockImplementation(
        ({ where, data }: { where: { id: string }; data: { status: ApptStatus } }) => {
          const row = rows.get(where.id);
          if (!row) return Promise.reject(new Error('ไม่มีแถวนี้'));
          row.status = data.status;
          return Promise.resolve(view(row));
        },
      );
    });

    describe.each([['confirm'], ['requestReschedule'], ['cancel']] as const)('%s', (action) => {
      it('ลูกค้า A แตะนัดของลูกค้า B ไม่ได้: ได้ 404 และนัดของ B ไม่เปลี่ยนเลย', async () => {
        const before = snapshot();

        await expect(portal.act('cus_a', 'appt_b', action)).rejects.toBeInstanceOf(
          NotFoundException,
        );

        expect(snapshot()).toEqual(before);
        expect(db.appointment.update).not.toHaveBeenCalled();
        expect(db.appointment.updateMany).not.toHaveBeenCalled();
        expect(waitlistQueue.publishOpenSlot).not.toHaveBeenCalled();
        expect(reminders.cancel).not.toHaveBeenCalled();
      });

      it('นัดที่ไม่มีอยู่จริงได้ 404 ข้อความเดียวกับนัดของคนอื่น — เดาไม่ได้ว่า id ไหนมีอยู่', async () => {
        const notMine = await portal.act('cus_a', 'appt_b', action).catch((e: Error) => e);
        const missing = await portal.act('cus_a', 'appt_nope', action).catch((e: Error) => e);

        expect(missing).toBeInstanceOf(NotFoundException);
        expect((missing as NotFoundException).getResponse()).toEqual(
          (notMine as NotFoundException).getResponse(),
        );
      });

      it('นัดที่ถึงเวลาไปแล้วกดไม่ได้ ได้ 400 และไม่เปลี่ยนสถานะ', async () => {
        rows.set(
          'appt_a',
          appointmentRow('appt_a', 'cus_a', {
            startsAt: bkk('2026-10-23T14:00'),
            endsAt: bkk('2026-10-23T15:00'),
          }),
        );

        await expect(portal.act('cus_a', 'appt_a', action)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(rows.get('appt_a')?.status).toBe(ApptStatus.BOOKED);
      });
    });

    it('ยกเลิกนัดของตัวเอง ประกาศช่องนั้นให้คนในคิวรอทันที', async () => {
      const appt = await portal.act('cus_a', 'appt_a', 'cancel');

      expect(waitlistQueue.publishOpenSlot).toHaveBeenCalledWith({
        providerId: 'prov_nan',
        serviceId: FACIAL.id,
        slotStart: bkk('2026-10-25T14:00'),
        slotEnd: bkk('2026-10-25T15:00'),
      });
      expect(rows.get('appt_a')?.status).toBe(ApptStatus.CANCELLED);
      expect(appt.actions).toEqual({ confirm: false, requestReschedule: false, cancel: false });
    });

    it('ยกเลิกเองบันทึกเหตุผลว่าลูกค้ายกเลิกผ่านหน้าเว็บ ร้านจะแยกออกจากที่พนักงานยกเลิกได้', async () => {
      await portal.act('cus_a', 'appt_a', 'cancel');

      expect(db.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelReason: expect.stringContaining('ลูกค้า') }),
        }),
      );
    });

    it('ยืนยันนัดของตัวเองแล้วปุ่มยืนยันกับขอเลื่อนหายไป เหลือแค่ยกเลิก', async () => {
      const appt = await portal.act('cus_a', 'appt_a', 'confirm');

      expect(rows.get('appt_a')?.status).toBe(ApptStatus.CONFIRMED);
      expect(appt).toMatchObject({
        status: ApptStatus.CONFIRMED,
        actions: { confirm: false, requestReschedule: false, cancel: true },
      });
    });

    it('ขอเลื่อนนัดแล้วยกเลิกงานเตือนนัดของเวลาเดิม', async () => {
      await portal.act('cus_a', 'appt_a', 'requestReschedule');

      expect(rows.get('appt_a')?.status).toBe(ApptStatus.RESCHEDULE_REQUESTED);
      expect(reminders.cancel).toHaveBeenCalledWith('appt_a');
    });

    it('กดยืนยันซ้ำได้ผลเท่ากดครั้งเดียว ไม่เขียนซ้ำและไม่ error', async () => {
      rows.set('appt_a', appointmentRow('appt_a', 'cus_a', { status: ApptStatus.CONFIRMED }));

      await expect(portal.act('cus_a', 'appt_a', 'confirm')).resolves.toMatchObject({
        status: ApptStatus.CONFIRMED,
      });
      expect(db.appointment.updateMany).not.toHaveBeenCalled();
    });

    it('นัดที่ยกเลิกไปแล้วกดยืนยันไม่ได้', async () => {
      rows.set('appt_a', appointmentRow('appt_a', 'cus_a', { status: ApptStatus.CANCELLED }));

      await expect(portal.act('cus_a', 'appt_a', 'confirm')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(rows.get('appt_a')?.status).toBe(ApptStatus.CANCELLED);
    });
  });

  describe('รายการนัดของฉัน', () => {
    it('แยกนัดที่จะถึงกับประวัติ นัดที่ยกเลิกแล้วอยู่ในประวัติ และนัดที่ผ่านไปไม่มีปุ่มให้กด', async () => {
      const row = (id: string, startsAt: string, status: ApptStatus) => ({
        id,
        startsAt: bkk(startsAt),
        endsAt: new Date(bkk(startsAt).getTime() + 3_600_000),
        status,
        provider: { name: 'คุณแนน' },
        service: { name: FACIAL.name, price: FACIAL.price },
      });
      // เรียงจากล่าสุดไปเก่าสุด เหมือนที่ฐานข้อมูลคืนตาม orderBy
      db.appointment.findMany.mockResolvedValue([
        row('later', '2026-10-30T11:00', ApptStatus.CONFIRMED),
        row('cancelled_future', '2026-10-28T11:00', ApptStatus.CANCELLED),
        row('soon', '2026-10-25T11:00', ApptStatus.BOOKED),
        row('done', '2026-10-17T11:00', ApptStatus.COMPLETED),
        row('forgotten', '2026-10-20T11:00', ApptStatus.BOOKED),
      ]);

      const list = await portal.listAppointments('cus_a');

      expect(db.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'cus_a' } }),
      );
      expect(list.upcoming.map((a) => a.id)).toEqual(['soon', 'later']);
      expect(list.past.map((a) => a.id)).toEqual(['cancelled_future', 'done', 'forgotten']);
      for (const appt of list.past) {
        expect(appt.actions).toEqual({ confirm: false, requestReschedule: false, cancel: false });
      }
    });
  });

  describe('คอร์สของฉัน', () => {
    it('คืนครั้งคงเหลือ วันที่เหลือ และสถานะของแต่ละคอร์ส', async () => {
      const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000);
      db.customerCourse.findMany.mockResolvedValue([
        {
          id: 'course_used_up',
          usedSessions: 5,
          expiresAt: inDays(12),
          package: {
            name: 'คอร์สนวดหน้า 5 ครั้ง',
            totalSessions: 5,
            serviceId: 'svc_massage',
            service: { name: 'นวดหน้าผ่อนคลาย' },
          },
        },
        {
          id: 'course_active',
          usedSessions: 2,
          expiresAt: inDays(120),
          package: { name: 'คอร์สรวม', totalSessions: 10, serviceId: null, service: null },
        },
      ]);

      const courses = await portal.courses('cus_a');

      expect(db.customerCourse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'cus_a' } }),
      );
      expect(courses).toEqual([
        {
          id: 'course_used_up',
          name: 'คอร์สนวดหน้า 5 ครั้ง',
          serviceId: 'svc_massage',
          serviceName: 'นวดหน้าผ่อนคลาย',
          totalSessions: 5,
          usedSessions: 5,
          remainingSessions: 0,
          expiresAt: inDays(12),
          daysToExpiry: 12,
          status: 'USED_UP',
        },
        {
          id: 'course_active',
          name: 'คอร์สรวม',
          serviceId: null,
          serviceName: null,
          totalSessions: 10,
          usedSessions: 2,
          remainingSessions: 8,
          expiresAt: inDays(120),
          daysToExpiry: 120,
          status: 'ACTIVE',
        },
      ]);
    });
  });
});
