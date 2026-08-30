import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CLOCK_OFFSET_STORE, type ClockOffsetStore } from './clock-offset.store';

/**
 * เวลาของระบบทั้งหมดต้องผ่านที่นี่ ห้ามเรียก new Date() ตรง ๆ ในโค้ดที่ตัดสินใจตามเวลา
 *
 * เหตุผลคือท่อนเดโมหลักของโปรเจกต์: งานเตือนนัดยิงล่วงหน้า 1 วัน ถ้าเดโมจริงต้องรอข้ามวัน
 * ปุ่ม "ข้ามเวลา" จึงขยับ offset ให้ทั้งระบบเห็นเวลาอนาคตพร้อมกัน แล้วงานที่ถึงกำหนดก็ยิงทันที
 *
 * เปิดได้เฉพาะ DEMO_MODE=true — บน production ของลูกค้าจริงต้องปิดตาย ไม่งั้นเวลาของ
 * ระบบนัดหมายเพี้ยนได้จากการยิง endpoint เดียว
 */
@Injectable()
export class ClockService implements OnModuleInit {
  private readonly logger = new Logger(ClockService.name);
  private offset = 0;

  constructor(
    private readonly config: ConfigService,
    @Inject(CLOCK_OFFSET_STORE) private readonly store: ClockOffsetStore,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.demoMode) return;

    await this.refresh();
  }

  get demoMode(): boolean {
    return this.config.get<boolean>('DEMO_MODE') === true;
  }

  get offsetMs(): number {
    return this.offset;
  }

  /** เวลาปัจจุบันตามที่ระบบเชื่อ — ในโหมดใช้งานจริงคือเวลาจริงเป๊ะ ๆ */
  now(): Date {
    return new Date(Date.now() + this.offset);
  }

  /** ดึงค่าล่าสุดจาก store — worker เรียกก่อนตัดสินใจ เผื่อฝั่ง API เพิ่งกดข้ามเวลา */
  async refresh(): Promise<number> {
    if (!this.demoMode) return 0;

    this.offset = await this.store.read();
    return this.offset;
  }

  /** ขยับเวลาไปข้างหน้า คืนค่า offset ใหม่และเวลาที่ระบบเห็นหลังขยับ */
  async advance(ms: number): Promise<{ offsetMs: number; now: Date }> {
    if (!this.demoMode) {
      throw new ForbiddenException('ปุ่มข้ามเวลาเปิดใช้ได้เฉพาะโหมดเดโมเท่านั้น');
    }

    if (!Number.isFinite(ms) || ms <= 0) {
      // ถอยเวลากลับจะทำให้ข้อมูลขัดกันเอง เช่นนัดที่ส่งข้อความไปแล้วกลับมาเป็นยังไม่ถึงเวลา
      throw new BadRequestException('ข้ามเวลาได้เฉพาะไปข้างหน้าเท่านั้น');
    }

    await this.refresh();
    this.offset += ms;
    await this.store.write(this.offset);
    this.logger.log(
      `ข้ามเวลาไป ${Math.round(ms / 60000)} นาที — ตอนนี้ระบบเห็นเวลา ${this.now().toISOString()}`,
    );

    return { offsetMs: this.offset, now: this.now() };
  }

  /** กลับมาเดินตามเวลาจริง — ใช้ตอนรีเซ็ตข้อมูลเดโม */
  async reset(): Promise<void> {
    if (!this.demoMode) return;

    this.offset = 0;
    await this.store.write(0);
  }
}
