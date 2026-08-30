import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockService } from './clock.service';
import type { ClockOffsetStore } from './clock-offset.store';

/** ที่เก็บ offset แบบในหน่วยความจำ — แทน Redis ตอนเทสต์ */
function memoryStore(initial = 0): ClockOffsetStore & { value: number } {
  return {
    value: initial,
    async read() {
      return this.value;
    },
    async write(ms: number) {
      this.value = ms;
    },
  };
}

function clockWith(demoMode: boolean, store: ClockOffsetStore): ClockService {
  const config = { get: () => demoMode } as unknown as ConfigService;
  return new ClockService(config, store);
}

const HOUR = 3_600_000;

describe('ClockService', () => {
  describe('โหมดใช้งานจริง', () => {
    it('คืนเวลาจริงของเครื่อง', () => {
      const clock = clockWith(false, memoryStore());

      expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
    });

    it('ห้ามข้ามเวลาเด็ดขาด — ปุ่มเดโมต้องปิดตายบน production ของลูกค้าจริง', async () => {
      const clock = clockWith(false, memoryStore());

      await expect(clock.advance(HOUR)).rejects.toThrow(ForbiddenException);
    });

    it('ไม่อ่าน offset ที่ค้างอยู่ใน Redis มาใช้ แม้จะมีค่าเก่าเหลืออยู่', async () => {
      const clock = clockWith(false, memoryStore(48 * HOUR));

      await clock.onModuleInit();

      expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
    });
  });

  describe('โหมดเดโม', () => {
    it('ข้ามเวลาไปข้างหน้าตามที่สั่ง', async () => {
      const clock = clockWith(true, memoryStore());
      const before = clock.now().getTime();

      await clock.advance(6 * HOUR);

      expect(clock.now().getTime() - before).toBeGreaterThanOrEqual(6 * HOUR);
    });

    it('ข้ามหลายครั้งแล้วบวกสะสม ไม่ใช่ทับค่าเดิม', async () => {
      const clock = clockWith(true, memoryStore());

      await clock.advance(2 * HOUR);
      const result = await clock.advance(3 * HOUR);

      expect(result.offsetMs).toBe(5 * HOUR);
    });

    it('เก็บ offset ไว้ที่ store เพื่อให้ worker คนละโปรเซสเห็นเวลาเดียวกัน', async () => {
      const store = memoryStore();
      const clock = clockWith(true, store);

      await clock.advance(4 * HOUR);

      expect(store.value).toBe(4 * HOUR);
    });

    it('อ่าน offset ที่มีอยู่ตอนเริ่มโปรเซส — worker ที่เพิ่งตื่นต้องไม่ย้อนเวลากลับ', async () => {
      const clock = clockWith(true, memoryStore(12 * HOUR));

      await clock.onModuleInit();

      expect(clock.now().getTime() - Date.now()).toBeGreaterThanOrEqual(12 * HOUR - 1000);
    });

    it('ซิงก์ค่าล่าสุดจาก store ได้ระหว่างทำงาน เผื่ออีกโปรเซสเพิ่งกดข้ามเวลา', async () => {
      const store = memoryStore();
      const clock = clockWith(true, store);
      store.value = 8 * HOUR;

      await clock.refresh();

      expect(clock.offsetMs).toBe(8 * HOUR);
    });

    it('รีเซ็ตกลับมาเดินตามเวลาจริง', async () => {
      const store = memoryStore();
      const clock = clockWith(true, store);
      await clock.advance(5 * HOUR);

      await clock.reset();

      expect(clock.offsetMs).toBe(0);
      expect(store.value).toBe(0);
    });

    it('ถอยเวลากลับไม่ได้ — งานที่ยิงไปแล้วเรียกคืนไม่ได้ ข้อมูลจะขัดกันเอง', async () => {
      const clock = clockWith(true, memoryStore());

      await expect(clock.advance(-HOUR)).rejects.toThrow();
    });
  });
});
