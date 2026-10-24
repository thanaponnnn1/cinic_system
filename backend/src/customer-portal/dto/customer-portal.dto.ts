import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

/**
 * ไม่มีช่อง customerId ในทุก DTO ฝั่งลูกค้าโดยตั้งใจ — ตัวตนมาจาก token เท่านั้น
 * และ ValidationPipe (forbidNonWhitelisted) ปฏิเสธคำขอที่แนบฟิลด์นี้มาเอง
 */
export class CustomerAvailabilityQueryDto {
  @ApiProperty({ example: '2026-10-25', description: 'วันตามปฏิทินไทย' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
  @IsDateString({ strict: true }, { message: 'วันที่ไม่ถูกต้อง' })
  date: string;

  @ApiProperty()
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({ description: 'ไม่ระบุ = ช่างคนไหนก็ได้ (รวมช่องว่างของทุกคน)' })
  @IsOptional()
  @IsString()
  providerId?: string;
}

export class BookAppointmentDto {
  @ApiProperty()
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({ description: 'ไม่ระบุ = ให้ระบบเลือกช่างที่ว่างในช่องนั้น' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({ example: '2026-10-25T10:00:00+07:00' })
  @IsDateString({}, { message: 'รูปแบบวันเวลาไม่ถูกต้อง' })
  startsAt: string;

  @ApiPropertyOptional({ description: 'ใช้ครั้งจากคอร์สของตัวเอง' })
  @IsOptional()
  @IsString()
  customerCourseId?: string;
}
