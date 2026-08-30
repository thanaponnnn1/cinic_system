import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { HEARTBEAT_KEY, JobDispatcherService } from './job-dispatcher.service';
import type { ReminderProcessorService } from '../reminders/reminder-processor.service';
import type { DigestService } from '../digest/digest.service';

describe('JobDispatcherService', () => {
  const processor = { process: jest.fn() };
  const digest = { sendDailyDigest: jest.fn() };
  const redis = { set: jest.fn() };

  function build(): JobDispatcherService {
    return new JobDispatcherService(
      processor as unknown as ReminderProcessorService,
      digest as unknown as DigestService,
      redis as never,
    );
  }

  beforeEach(() => {
    processor.process.mockReset().mockResolvedValue(DeliveryStatus.SENT);
    digest.sendDailyDigest.mockReset().mockResolvedValue(true);
    redis.set.mockReset().mockResolvedValue('OK');
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
