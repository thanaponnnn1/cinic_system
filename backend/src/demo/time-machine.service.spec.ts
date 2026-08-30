import { TimeMachineService } from './time-machine.service';
import type { ClockService } from '../clock/clock.service';

const HOUR = 3_600_000;
const REAL_NOW = 1_800_000_000_000;

/** งาน delayed ของ BullMQ เท่าที่ตัวโปรโมตงานต้องรู้ */
function delayedJob(scheduledFor: number) {
  return {
    id: `job-${scheduledFor}`,
    timestamp: REAL_NOW,
    opts: { delay: scheduledFor - REAL_NOW },
    promote: jest.fn().mockResolvedValue(undefined),
  };
}

describe('TimeMachineService', () => {
  const queue = { getDelayed: jest.fn() };
  const clock = { advance: jest.fn(), offsetMs: 0, now: () => new Date(REAL_NOW) };

  function build(): TimeMachineService {
    return new TimeMachineService(queue as never, clock as unknown as ClockService);
  }

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(REAL_NOW);
    queue.getDelayed.mockReset().mockResolvedValue([]);
    clock.advance.mockReset().mockImplementation(async (ms: number) => {
      clock.offsetMs += ms;
      return { offsetMs: clock.offsetMs, now: new Date(REAL_NOW + clock.offsetMs) };
    });
    clock.offsetMs = 0;
  });

  afterEach(() => jest.restoreAllMocks());

  it('ขยับเวลาผ่าน ClockService ซึ่งเป็นตัวที่กันไม่ให้ทำนอกโหมดเดโม', async () => {
    await build().advance(6 * HOUR);

    expect(clock.advance).toHaveBeenCalledWith(6 * HOUR);
  });

  it('ดันงานที่ถึงกำหนดตามเวลาใหม่ให้ทำงานทันที — นี่คือหัวใจของการเดโม', async () => {
    const due = delayedJob(REAL_NOW + 5 * HOUR);
    queue.getDelayed.mockResolvedValue([due]);

    const result = await build().advance(6 * HOUR);

    expect(due.promote).toHaveBeenCalled();
    expect(result.promoted).toBe(1);
  });

  it('ไม่แตะงานที่ยังไม่ถึงกำหนดแม้ข้ามเวลาไปแล้ว', async () => {
    const later = delayedJob(REAL_NOW + 20 * HOUR);
    queue.getDelayed.mockResolvedValue([later]);

    const result = await build().advance(6 * HOUR);

    expect(later.promote).not.toHaveBeenCalled();
    expect(result.promoted).toBe(0);
  });

  it('งานหนึ่งใบดันไม่ขึ้นต้องไม่ทำให้ใบอื่นค้าง — เดโมห้ามสะดุด', async () => {
    const broken = delayedJob(REAL_NOW + HOUR);
    broken.promote.mockRejectedValue(new Error('job ถูกลบไปแล้ว'));
    const fine = delayedJob(REAL_NOW + 2 * HOUR);
    queue.getDelayed.mockResolvedValue([broken, fine]);

    const result = await build().advance(6 * HOUR);

    expect(fine.promote).toHaveBeenCalled();
    expect(result.promoted).toBe(1);
  });

  it('บอก offset ปัจจุบันและเวลาที่ระบบเห็น เพื่อให้หน้าจอเดโมแสดงได้', async () => {
    const result = await build().advance(3 * HOUR);

    expect(result.offsetMs).toBe(3 * HOUR);
    expect(result.now).toEqual(new Date(REAL_NOW + 3 * HOUR));
  });
});
