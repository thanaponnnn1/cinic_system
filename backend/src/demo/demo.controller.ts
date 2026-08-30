import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@clinicq/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClockService } from '../clock/clock.service';
import { DigestService } from '../digest/digest.service';
import { TimeMachineService, type AdvanceResult } from './time-machine.service';
import { AdvanceTimeDto } from './dto/advance-time.dto';

/** ค่าตั้งต้นของปุ่มข้ามเวลา = 1 วัน ซึ่งพอดีกับจังหวะเตือนล่วงหน้า 1 วัน */
const DEFAULT_MINUTES = 24 * 60;

/**
 * เครื่องมือสำหรับเดโมเท่านั้น
 *
 * ทุก endpoint ในนี้ผ่าน ClockService ซึ่งปฏิเสธการทำงานเมื่อ DEMO_MODE ไม่ใช่ true
 * จึงปิดตายเองบน production ของลูกค้าจริงแม้ route จะยังถูก map ไว้
 */
@ApiTags('เดโม')
@ApiBearerAuth()
@Controller('demo')
export class DemoController {
  constructor(
    private readonly timeMachine: TimeMachineService,
    private readonly clock: ClockService,
    private readonly digest: DigestService,
  ) {}

  @Post('advance-time')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ข้ามเวลาไปข้างหน้า',
    description:
      'ขยับเวลาที่ระบบเห็น แล้วดันงานในคิวที่ถึงกำหนดตามเวลาใหม่ให้ทำงานทันที — ' +
      'ใช้โชว์ข้อความเตือนนัดล่วงหน้า 1 วันโดยไม่ต้องรอข้ามวันจริง',
  })
  @ApiResponse({ status: 403, description: 'ไม่ได้เปิดโหมดเดโม' })
  advanceTime(@Body() dto: AdvanceTimeDto): Promise<AdvanceResult> {
    return this.timeMachine.advance((dto.minutes ?? DEFAULT_MINUTES) * 60_000);
  }

  @Post('send-digest')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ยิงสรุปปิดร้านทันที',
    description:
      'ปกติงานนี้ทำงานเองสามทุ่มตามเวลาไทย — ปุ่มนี้ไว้โชว์ข้อความจริงตอนเดโมโดยไม่ต้องรอ',
  })
  async sendDigest(): Promise<{ sent: boolean }> {
    return { sent: await this.digest.sendDailyDigest() };
  }

  @Get('clock')
  @ApiOperation({ summary: 'เวลาที่ระบบเห็นตอนนี้' })
  currentClock(): { now: Date; offsetMs: number; demoMode: boolean } {
    return {
      now: this.clock.now(),
      offsetMs: this.clock.offsetMs,
      demoMode: this.clock.demoMode,
    };
  }

  @Post('reset-clock')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'กลับมาเดินตามเวลาจริง' })
  async resetClock(): Promise<{ now: Date; offsetMs: number }> {
    await this.clock.reset();

    return { now: this.clock.now(), offsetMs: this.clock.offsetMs };
  }
}
