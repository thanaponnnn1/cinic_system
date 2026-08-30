import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MsgType } from '@clinicq/shared';

/** ชนิดข้อความเตือนที่สั่งส่งเองได้จาก dashboard */
const MANUAL_TYPES = [MsgType.REMINDER_1D, MsgType.REMINDER_2H] as const;

export class SendReminderDto {
  @ApiPropertyOptional({
    enum: MANUAL_TYPES,
    default: MsgType.REMINDER_1D,
    description: 'ชนิดข้อความเตือน — ไม่ระบุจะใช้ข้อความเตือนล่วงหน้า 1 วัน',
  })
  @IsOptional()
  @IsEnum(MsgType)
  type?: MsgType;
}
