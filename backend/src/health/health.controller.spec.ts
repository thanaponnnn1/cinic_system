import { Test, type TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const ping = jest.fn();

  beforeEach(async () => {
    ping.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { ping } }],
    }).compile();

    controller = module.get(HealthController);
  });

  describe('GET /health', () => {
    it('คืนสถานะ ok โดยไม่แตะฐานข้อมูล', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
      // ข้อนี้สำคัญ: liveness check ต้องไม่พึ่ง DB ไม่งั้นเวลา DB ช้าจะถูกเข้าใจว่าเซิร์ฟเวอร์ตาย
      expect(ping).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/deep', () => {
    it('รายงาน ok พร้อมเวลาตอบสนองเมื่อฐานข้อมูลปกติ', async () => {
      ping.mockResolvedValue(7);

      const result = await controller.deepCheck();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toEqual({ status: 'ok', latencyMs: 7 });
    });

    it('รายงาน degraded แทนที่จะโยน error เมื่อฐานข้อมูลล่ม', async () => {
      ping.mockRejectedValue(new Error('connection refused'));

      const result = await controller.deepCheck();

      // ต้องยังตอบได้ ไม่ใช่ 500 — ไม่งั้นตอนไล่หาสาเหตุจะไม่รู้ว่าตัวไหนเจ๊ง
      expect(result.status).toBe('degraded');
      expect(result.checks.database.status).toBe('error');
      expect(result.checks.database.message).toContain('connection refused');
    });
  });
});
