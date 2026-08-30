import { DemoController } from './demo.controller';
import type { TimeMachineService } from './time-machine.service';
import type { ClockService } from '../clock/clock.service';
import type { DigestService } from '../digest/digest.service';

const NOW = new Date('2026-09-01T03:00:00.000Z');

describe('DemoController', () => {
  const timeMachine = { advance: jest.fn() };
  const clock = { now: () => NOW, offsetMs: 7_200_000, demoMode: true, reset: jest.fn() };
  const digest = { sendDailyDigest: jest.fn() };

  function build(): DemoController {
    return new DemoController(
      timeMachine as unknown as TimeMachineService,
      clock as unknown as ClockService,
      digest as unknown as DigestService,
    );
  }

  beforeEach(() => {
    timeMachine.advance.mockReset().mockResolvedValue({ offsetMs: 0, now: NOW, promoted: 0 });
    clock.reset.mockReset().mockResolvedValue(undefined);
    digest.sendDailyDigest.mockReset().mockResolvedValue(true);
  });

  it('แปลงนาทีที่ขอมาเป็นมิลลิวินาทีก่อนส่งต่อ', async () => {
    await build().advanceTime({ minutes: 90 });

    expect(timeMachine.advance).toHaveBeenCalledWith(90 * 60_000);
  });

  it('ค่าตั้งต้นคือข้ามไป 1 วัน — ปุ่มเดโมกดครั้งเดียวให้ถึงเวลาเตือนล่วงหน้า 1 วันพอดี', async () => {
    await build().advanceTime({});

    expect(timeMachine.advance).toHaveBeenCalledWith(24 * 60 * 60_000);
  });

  it('บอกจำนวนงานที่ถูกดันให้ทำงาน เพื่อให้คนเดโมรู้ว่ามีข้อความกำลังจะเด้ง', async () => {
    timeMachine.advance.mockResolvedValue({ offsetMs: 86_400_000, now: NOW, promoted: 2 });

    await expect(build().advanceTime({ minutes: 1440 })).resolves.toMatchObject({ promoted: 2 });
  });

  it('บอกเวลาปัจจุบันที่ระบบเห็นและ offset ที่สะสมไว้', () => {
    expect(build().currentClock()).toEqual({
      now: NOW,
      offsetMs: 7_200_000,
      demoMode: true,
    });
  });

  it('รีเซ็ตนาฬิกากลับมาเดินตามเวลาจริงได้', async () => {
    await build().resetClock();

    expect(clock.reset).toHaveBeenCalled();
  });

  it('ยิงสรุปปิดร้านได้ทันทีตอนเดโม ไม่ต้องรอสามทุ่ม', async () => {
    await expect(build().sendDigest()).resolves.toEqual({ sent: true });

    expect(digest.sendDailyDigest).toHaveBeenCalled();
  });

  it('บอกตามจริงเมื่อยังไม่ได้ตั้งปลายทางของสรุป', async () => {
    digest.sendDailyDigest.mockResolvedValue(false);

    await expect(build().sendDigest()).resolves.toEqual({ sent: false });
  });
});
