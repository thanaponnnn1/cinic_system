import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BRAND_INFO, type DeepHealthResponse, type HealthResponse } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { APP_VERSION } from '../common/app-version';

@ApiTags('ระบบ')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ตรวจว่าโปรเซสยังมีชีวิต — ตัวนี้ให้ uptime monitor ภายนอกยิงทุก 5 นาที
   * ต้องเบาที่สุดและห้ามแตะฐานข้อมูล ไม่งั้นเวลา DB ช้าจะถูกมองว่าเซิร์ฟเวอร์ล่ม
   */
  @Get()
  @ApiOperation({ summary: 'ตรวจสถานะพื้นฐาน (liveness)' })
  @ApiResponse({ status: 200, description: 'ระบบทำงานปกติ' })
  check(): HealthResponse {
    return {
      status: 'ok',
      service: `${BRAND_INFO.productName} API`,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
    };
  }

  /**
   * ตรวจลึกถึงบริการที่พึ่งพา — ใช้ตอนไล่หาสาเหตุว่าระบบช้าตรงไหน
   * คืน 200 เสมอพร้อมรายละเอียดในเนื้อ response เพื่อให้เห็นภาพครบว่าตัวไหนเจ๊ง
   */
  @Get('deep')
  @ApiOperation({ summary: 'ตรวจสถานะพร้อมบริการที่พึ่งพา (DB, Redis)' })
  async deepCheck(): Promise<DeepHealthResponse> {
    const database = await this.checkDatabase();

    // Redis เข้ามาจริงตอน Phase 4 (คิวงานเตือนนัด) — ตอนนี้รายงานตรง ๆ ว่ายังไม่ได้ต่อ
    const redis: DeepHealthResponse['checks']['redis'] = {
      status: 'not_configured',
      message: 'ยังไม่ได้เชื่อมต่อ — จะใช้งานจริงใน Phase 4 (คิวงานเตือนนัด)',
    };

    return {
      status: database.status === 'ok' ? 'ok' : 'degraded',
      service: `${BRAND_INFO.productName} API`,
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DeepHealthResponse['checks']['database']> {
    try {
      const latencyMs = await this.prisma.ping();
      return { status: 'ok', latencyMs };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'เชื่อมต่อฐานข้อมูลไม่ได้',
      };
    }
  }
}
