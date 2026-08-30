import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    // ตั้งแต่ Prisma 7 การต่อฐานข้อมูลทำผ่าน driver adapter
    // ไม่ใช่อ่าน url จาก schema.prisma เหมือนเวอร์ชันก่อน
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('เชื่อมต่อฐานข้อมูลสำเร็จ');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
  }

  /** ใช้โดย /health/deep — วัดว่า DB ยังตอบอยู่และตอบเร็วแค่ไหน */
  async ping(): Promise<number> {
    const startedAt = Date.now();
    await this.$queryRaw`SELECT 1`;
    return Date.now() - startedAt;
  }
}
