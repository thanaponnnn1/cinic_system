import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role, WaitlistStatus } from '@clinicq/shared';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateWaitlistEntryDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  serviceId: string;

  @ApiProperty({
    example: '2026-09-02T09:00:00+07:00',
    description: 'ต้นช่วงเวลาที่ลูกค้าบอกว่าสะดวก',
  })
  @IsDateString()
  windowStart: string;

  @ApiProperty({ example: '2026-09-02T17:00:00+07:00', description: 'ปลายช่วงเวลาที่สะดวก' })
  @IsDateString()
  windowEnd: string;
}

export class FindWaitlistQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: WaitlistStatus,
    description: 'ไม่ระบุ = เฉพาะคนที่ยังรอคิวและที่กำลังถูกเสนอคิวอยู่',
  })
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

/** ข้อมูลคิวรอที่ส่งกลับหน้าจอ — ซ่อนเบอร์โทรตามสิทธิ์เหมือนหน้าลูกค้า */
export class WaitlistEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty({ enum: WaitlistStatus })
  status: WaitlistStatus;

  @ApiProperty()
  windowStart: Date;

  @ApiProperty()
  windowEnd: Date;

  @ApiPropertyOptional({ description: 'คิวที่กำลังเสนอให้อยู่ตอนนี้' })
  offeredSlotAt: Date | null;

  @ApiPropertyOptional({ description: 'กดรับได้ถึงเมื่อไหร่' })
  offerExpiresAt: Date | null;

  @ApiProperty({ description: 'ผูกบัญชี LINE แล้วหรือยัง — ยังไม่ผูกจะไม่ได้รับข้อเสนอคิวว่าง' })
  lineLinked: boolean;

  @ApiProperty()
  createdAt: Date;

  static from(
    entry: {
      id: string;
      customerId: string;
      serviceId: string;
      status: string;
      windowStart: Date;
      windowEnd: Date;
      offeredSlotAt: Date | null;
      offerExpiresAt: Date | null;
      createdAt: Date;
      customer: { name: string; lineUserId: string | null };
      service: { name: string };
    },
    _viewerRole?: Role,
  ): WaitlistEntryResponseDto {
    return {
      id: entry.id,
      customerId: entry.customerId,
      customerName: entry.customer.name,
      serviceId: entry.serviceId,
      serviceName: entry.service.name,
      status: entry.status as WaitlistStatus,
      windowStart: entry.windowStart,
      windowEnd: entry.windowEnd,
      offeredSlotAt: entry.offeredSlotAt,
      offerExpiresAt: entry.offerExpiresAt,
      lineLinked: Boolean(entry.customer.lineUserId),
      createdAt: entry.createdAt,
    };
  }
}
