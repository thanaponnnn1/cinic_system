import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApptStatus } from '@clinicq/shared';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiProperty()
  @IsString()
  serviceId: string;

  @ApiProperty({
    example: '2026-09-01T10:00:00+07:00',
    description: 'เวลาเริ่มนัด · เวลาสิ้นสุดคำนวณจากระยะเวลาของบริการให้อัตโนมัติ',
  })
  @IsDateString({}, { message: 'รูปแบบวันเวลาไม่ถูกต้อง' })
  startsAt: string;

  @ApiPropertyOptional({ description: 'ตัดครั้งจากคอร์สที่ลูกค้าซื้อไว้' })
  @IsOptional()
  @IsString()
  customerCourseId?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-09-02T14:00:00+07:00', description: 'เวลาใหม่ที่ต้องการย้ายไป' })
  @IsDateString({}, { message: 'รูปแบบวันเวลาไม่ถูกต้อง' })
  startsAt: string;

  @ApiPropertyOptional({ description: 'ย้ายไปช่างคนอื่น — ไม่ระบุคือใช้ช่างคนเดิม' })
  @IsOptional()
  @IsString()
  providerId?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({
    example: 'ลูกค้าติดธุระ',
    description: 'เก็บไว้ดูว่าคิวหลุดเพราะอะไรบ่อยที่สุด',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({
    description: 'ตัดครั้งจากคอร์ส — ไม่ระบุจะใช้คอร์สที่ผูกไว้ตอนสร้างนัด (ถ้ามี)',
  })
  @IsOptional()
  @IsString()
  customerCourseId?: string;
}

export class FindAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'ดูคิวของวันนั้นทั้งวัน (ตามเวลาไทย) — ใช้กับหน้าบอร์ดคิว',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'ช่วงเวลาเริ่มต้น (ใช้แทน date เมื่ออยากได้หลายวัน)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ช่วงเวลาสิ้นสุด' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: ApptStatus, isArray: true })
  @IsOptional()
  // รับได้ทั้ง ?status=BOOKED และ ?status=BOOKED&status=CONFIRMED
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsEnum(ApptStatus, { each: true, message: 'สถานะนัดไม่ถูกต้อง' })
  status?: ApptStatus[];

  @ApiPropertyOptional({
    description: 'เรียงตามเวลานัด',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}

export class DayBoardQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'ไม่ระบุ = วันนี้ (ตามเวลาไทย)',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'ดูเฉพาะช่างคนเดียว' })
  @IsOptional()
  @IsString()
  providerId?: string;
}

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  date: string;

  @ApiProperty()
  @IsString()
  providerId: string;

  @ApiProperty({ description: 'ใช้คำนวณว่าช่องว่างยาวพอสำหรับบริการนี้ไหม' })
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({ default: 15, description: 'ความละเอียดของช่องเวลาเป็นนาที' })
  @IsOptional()
  @Type(() => Number)
  slotMinutes?: number = 15;
}
