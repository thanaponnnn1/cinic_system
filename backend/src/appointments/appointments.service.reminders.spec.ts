import { Test, type TestingModule } from '@nestjs/testing';
import { ApptStatus, Role } from '@clinicq/shared';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderSchedulerService } from '../reminders/reminder-scheduler.service';
import { WaitlistQueueService } from '../waitlist/waitlist-queue.service';
import { CampaignAttributionService } from '../campaigns/campaign-attribution.service';
import { ClockService } from '../clock/clock.service';

/**
 * นัดกับงานเตือนต้องเดินไปด้วยกันเสมอ
 *
 * ถ้าสองอย่างนี้หลุดจากกันเมื่อไหร่ ลูกค้าจะได้ข้อความเตือนนัดที่ยกเลิกไปแล้ว
 * หรือไม่ได้รับข้อความของนัดที่เพิ่งย้ายเวลา — ทั้งสองแบบทำให้ร้านเสียความน่าเชื่อถือทันที
 */
describe('AppointmentsService — ซิงก์งานเตือนนัด', () => {
  let service: AppointmentsService;

  const created = {
    id: 'appt_new',
    startsAt: new Date('2026-09-02T03:30:00.000Z'),
    endsAt: new Date('2026-09-02T04:00:00.000Z'),
    status: ApptStatus.BOOKED,
    customer: { id: 'cus_1', name: 'สมหญิง ใจดี', phone: '0812345678', lineUserId: null },
    provider: { id: 'prov_1', name: 'คุณฟ้า' },
    service: { id: 'svc_1', name: 'ดูแลผิวรอบดวงตา', durationMin: 30, price: 1500 },
  };

  const prisma = { $transaction: jest.fn() };
  const scheduler = { sync: jest.fn(), cancel: jest.fn() };
  const waitlistQueue = { publishOpenSlot: jest.fn() };
  const attribution = { stampReturn: jest.fn(), stampRevenue: jest.fn() };

  beforeEach(async () => {
    prisma.$transaction.mockReset().mockResolvedValue(created);
    scheduler.sync.mockReset().mockResolvedValue(undefined);
    scheduler.cancel.mockReset().mockResolvedValue(undefined);
    waitlistQueue.publishOpenSlot.mockReset().mockResolvedValue(undefined);
    attribution.stampReturn.mockReset().mockResolvedValue(0);
    attribution.stampRevenue.mockReset().mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReminderSchedulerService, useValue: scheduler },
        { provide: WaitlistQueueService, useValue: waitlistQueue },
        { provide: CampaignAttributionService, useValue: attribution },
        { provide: ClockService, useValue: { now: () => new Date('2026-09-01T03:00:00.000Z') } },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  it('สร้างนัดแล้วตั้งงานเตือนของนัดใบนั้นทันที', async () => {
    await service.create(
      {
        customerId: 'cus_1',
        providerId: 'prov_1',
        serviceId: 'svc_1',
        startsAt: created.startsAt.toISOString(),
      },
      'user_1',
      Role.STAFF,
    );

    expect(scheduler.sync).toHaveBeenCalledWith('appt_new', created.startsAt);
  });

  it('ย้ายเวลานัดแล้วลบงานของใบเดิม และตั้งงานให้ใบใหม่', async () => {
    await service.reschedule(
      'appt_old',
      { startsAt: created.startsAt.toISOString() },
      'user_1',
      Role.STAFF,
    );

    expect(scheduler.cancel).toHaveBeenCalledWith('appt_old');
    expect(scheduler.sync).toHaveBeenCalledWith('appt_new', created.startsAt);
  });

  it('ยกเลิกนัดแล้วลบงานเตือนทิ้ง', async () => {
    prisma.$transaction.mockResolvedValue({
      ...created,
      id: 'appt_1',
      status: ApptStatus.CANCELLED,
    });

    await service.cancel('appt_1', { reason: 'ลูกค้าติดธุระ' }, Role.STAFF);

    expect(scheduler.cancel).toHaveBeenCalledWith('appt_1');
  });

  it('บันทึกว่าไม่มาตามนัดแล้วลบงานเตือนทิ้ง', async () => {
    prisma.$transaction.mockResolvedValue({ ...created, id: 'appt_1', status: ApptStatus.NO_SHOW });

    await service.noShow('appt_1', Role.STAFF);

    expect(scheduler.cancel).toHaveBeenCalledWith('appt_1');
  });

  it('ปิดงานแล้วลบงานเตือนทิ้ง — บริการเสร็จแล้วไม่ต้องเตือนอีก', async () => {
    prisma.$transaction.mockResolvedValue({
      ...created,
      id: 'appt_1',
      status: ApptStatus.COMPLETED,
    });

    await service.complete('appt_1', {}, Role.STAFF);

    expect(scheduler.cancel).toHaveBeenCalledWith('appt_1');
  });

  it('ลูกค้ายืนยันนัดแล้วงานเตือนก่อน 2 ชั่วโมงต้องยังอยู่ ไม่ถูกลบไปด้วย', async () => {
    prisma.$transaction.mockResolvedValue({
      ...created,
      id: 'appt_1',
      status: ApptStatus.CONFIRMED,
    });

    await service.confirm('appt_1', Role.STAFF);

    expect(scheduler.cancel).not.toHaveBeenCalled();
    expect(scheduler.sync).not.toHaveBeenCalled();
  });

  it('ลูกค้าขอเลื่อนนัดแล้วหยุดเตือนไว้ก่อน — เตือนเวลาเดิมที่ลูกค้าขอย้ายไปแล้วยิ่งสับสน', async () => {
    prisma.$transaction.mockResolvedValue({
      ...created,
      id: 'appt_1',
      status: ApptStatus.RESCHEDULE_REQUESTED,
    });

    await service.requestReschedule('appt_1', Role.STAFF);

    expect(scheduler.cancel).toHaveBeenCalledWith('appt_1');
  });

  describe('คิวที่ว่างจากการยกเลิก', () => {
    it('ยกเลิกนัดแล้วประกาศคิวว่างให้คนในคิวรอทันที — นี่คือจุดที่ช่องว่างกลายเป็นเงิน', async () => {
      prisma.$transaction.mockResolvedValue({
        ...created,
        id: 'appt_1',
        status: ApptStatus.CANCELLED,
      });

      await service.cancel('appt_1', { reason: 'ลูกค้าติดธุระ' }, Role.STAFF);

      expect(waitlistQueue.publishOpenSlot).toHaveBeenCalledWith({
        providerId: 'prov_1',
        serviceId: 'svc_1',
        slotStart: created.startsAt,
        slotEnd: created.endsAt,
      });
    });

    it('ไม่มาตามนัดไม่ประกาศคิวว่าง — เวลานั้นผ่านไปแล้ว ไม่มีใครมารับได้ทัน', async () => {
      prisma.$transaction.mockResolvedValue({
        ...created,
        id: 'appt_1',
        status: ApptStatus.NO_SHOW,
      });

      await service.noShow('appt_1', Role.STAFF);

      expect(waitlistQueue.publishOpenSlot).not.toHaveBeenCalled();
    });
  });
});
