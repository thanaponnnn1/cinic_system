import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeliveryStatus, MsgType, Role } from '@clinicq/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { SendReminderDto } from './dto/send-reminder.dto';

/**
 * สั่งส่งข้อความเตือนนัดด้วยมือ
 *
 * ตัวจับเวลาอัตโนมัติมาใน Phase 4 — ปุ่มนี้คือทางที่พนักงานส่งซ้ำเองได้เมื่อลูกค้าบอกว่าไม่ได้รับ
 * และเป็นวิธีเดโมข้อความบนมือถือจริงโดยไม่ต้องรอข้ามวัน
 */
@ApiTags('การแจ้งเตือน')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('appointments/:id/reminder')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ส่งข้อความเตือนนัดเข้า LINE ของลูกค้า',
    description:
      'คืนผลตามจริงเสมอ — ถ้าลูกค้ายังไม่ผูก LINE หรือไม่ได้ให้ความยินยอม จะได้สถานะ SKIPPED_* ' +
      'พร้อมบันทึกลง MessageLog เพื่อตรวจย้อนหลังได้',
  })
  @ApiResponse({ status: 404, description: 'ไม่พบนัดหมายรายการนี้' })
  async sendReminder(
    @Param('id') id: string,
    @Body() dto: SendReminderDto,
  ): Promise<{ deliveryStatus: DeliveryStatus }> {
    const deliveryStatus = await this.notifications.sendAppointmentReminder(
      id,
      dto.type ?? MsgType.REMINDER_1D,
    );

    return { deliveryStatus };
  }
}
