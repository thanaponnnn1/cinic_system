import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { HEARTBEAT_KEY, JobDispatcherService } from './job-dispatcher.service';
import type { ReminderProcessorService } from '../reminders/reminder-processor.service';
import type { DigestService } from '../digest/digest.service';
import type { WaitlistEngineService } from '../waitlist/waitlist-engine.service';
import type { ClockService } from '../clock/clock.service';

describe('JobDispatcherService', () => {
  const processor = { process: jest.fn() };
  const digest = { sendDailyDigest: jest.fn() };
  const redis = { set: jest.fn() };
  const waitlist = { offerSlot: jest.fn(), expireOffers: jest.fn() };
  const clock = { refresh: jest.fn() };

  function build(): JobDispatcherService {
    return new JobDispatcherService(
      processor as unknown as ReminderProcessorService,
      digest as unknown as DigestService,
      redis as never,
      waitlist as unknown as WaitlistEngineService,
      clock as unknown as ClockService,
    );
  }

  beforeEach(() => {
    clock.refresh.mockReset().mockResolvedValue(0);
    processor.process.mockReset().mockResolvedValue(DeliveryStatus.SENT);
    digest.sendDailyDigest.mockReset().mockResolvedValue(true);
    redis.set.mockReset().mockResolvedValue('OK');
    waitlist.offerSlot.mockReset().mockResolvedValue(2);
    waitlist.expireOffers.mockReset().mockResolvedValue(0);
  });

  it('ส่งงานเตือนล่วงหน้า 1 วันให้ตัวประมวลผลข้อความ', async () => {
    await build().dispatch(MsgType.REMINDER_1D, {
      appointmentId: 'appt_1',
      type: MsgType.REMINDER_1D,
    });

    expect(processor.process).toHaveBeenCalledWith({
      appointmentId: 'appt_1',
      type: MsgType.REMINDER_1D,
    });
  });

  it('ส่งงานเตือนก่อน 2 ชั่วโมงให้ตัวเดียวกัน', async () => {
    await build().dispatch(MsgType.REMINDER_2H, {
      appointmentId: 'appt_1',
      type: MsgType.REMINDER_2H,
    });

    expect(processor.process).toHaveBeenCalled();
  });

  it('งานสรุปปิดร้านเรียกตัวสรุปรายวัน ไม่ใช่ตัวส่งข้อความเตือนนัด', async () => {
    await build().dispatch('daily-digest', undefined);

    expect(digest.sendDailyDigest).toHaveBeenCalled();
    expect(processor.process).not.toHaveBeenCalled();
  });

  it('งาน heartbeat เขียนเวลาล่าสุดไว้ที่ Redis ให้ตัวเฝ้าระบบมาอ่าน', async () => {
    await build().dispatch('heartbeat', undefined);

    expect(redis.set).toHaveBeenCalledWith(HEARTBEAT_KEY, expect.any(String));
  });

  it('งานชนิดที่ยังไม่รู้จักต้องไม่ทำให้ worker ล้มทั้งตัว', async () => {
    await expect(build().dispatch('งานจากอนาคต', undefined)).resolves.toBeNull();
  });
});

describe('JobDispatcherService — งานของคิวรอ', () => {
  const processor = { process: jest.fn() };
  const digest = { sendDailyDigest: jest.fn() };
  const redis = { set: jest.fn() };
  const waitlist = { offerSlot: jest.fn(), expireOffers: jest.fn() };
  const clock = { refresh: jest.fn() };

  function build(): JobDispatcherService {
    return new JobDispatcherService(
      processor as unknown as ReminderProcessorService,
      digest as unknown as DigestService,
      redis as never,
      waitlist as unknown as WaitlistEngineService,
      clock as unknown as ClockService,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    waitlist.offerSlot.mockResolvedValue(2);
    waitlist.expireOffers.mockResolvedValue(1);
    clock.refresh.mockResolvedValue(0);
  });

  it('ซิงก์นาฬิกาก่อนทำงานทุกชนิด — ไม่งั้นงานปิดข้อเสนอจะไม่เห็นว่าเวลาถูกข้ามไปแล้ว', async () => {
    await build().dispatch('waitlist-expire', undefined);

    expect(clock.refresh.mock.invocationCallOrder[0]).toBeLessThan(
      waitlist.expireOffers.mock.invocationCallOrder[0],
    );
  });

  it('งานจับคู่คิวว่างแปลงเวลาจากสตริงกลับเป็น Date ก่อนส่งต่อ', async () => {
    await build().dispatch('waitlist-match', {
      providerId: 'prov_1',
      serviceId: 'svc_1',
      slotStart: '2026-09-02T03:30:00.000Z',
      slotEnd: '2026-09-02T04:00:00.000Z',
    } as never);

    expect(waitlist.offerSlot).toHaveBeenCalledWith({
      providerId: 'prov_1',
      serviceId: 'svc_1',
      slotStart: new Date('2026-09-02T03:30:00.000Z'),
      slotEnd: new Date('2026-09-02T04:00:00.000Z'),
    });
  });

  it('งานปิดข้อเสนอเรียกตัวเก็บกวาดข้อเสนอที่หมดเวลา', async () => {
    await build().dispatch('waitlist-expire', undefined);

    expect(waitlist.expireOffers).toHaveBeenCalled();
    expect(waitlist.offerSlot).not.toHaveBeenCalled();
  });

  it('งานจับคู่คิวว่างที่ข้อมูลไม่ครบต้องไม่ไปแตะฐานข้อมูล', async () => {
    await expect(
      build().dispatch('waitlist-match', { providerId: 'prov_1' } as never),
    ).resolves.toBeNull();

    expect(waitlist.offerSlot).not.toHaveBeenCalled();
  });
});
