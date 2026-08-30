import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  DELIVERY_STATUS_LABEL,
  DeliveryStatus,
  MsgType,
  type PaginatedResponse,
} from '@clinicq/shared';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class FindMessagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MsgType })
  @IsOptional()
  @IsEnum(MsgType)
  type?: MsgType;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}

/**
 * หนึ่งบรรทัดของหน้าตรวจสอบการส่งข้อความ
 *
 * ไม่มีเนื้อความจริงอยู่ในนี้โดยตั้งใจ — MessageLog เก็บแค่ "ตัดสินใจอะไรกับใครเมื่อไหร่"
 * ไม่เก็บข้อความที่ส่ง จึงไม่มีทางที่หน้านี้จะกลายเป็นที่รั่วของข้อมูลส่วนตัว
 */
export class MessageLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional({ description: 'นัดที่ข้อความนี้อ้างถึง ถ้ามี' })
  appointmentId: string | null;

  @ApiPropertyOptional()
  appointmentAt: Date | null;

  @ApiProperty({ enum: MsgType })
  type: MsgType;

  @ApiProperty({ enum: DeliveryStatus })
  deliveryStatus: DeliveryStatus;

  @ApiProperty({ description: 'คำอธิบายภาษาไทยของผลการส่ง' })
  deliveryLabel: string;

  @ApiPropertyOptional()
  errorMessage: string | null;

  @ApiProperty()
  sentAt: Date;

  static from(entity: {
    id: string;
    customerId: string;
    appointmentId: string | null;
    type: string;
    deliveryStatus: string;
    errorMessage: string | null;
    sentAt: Date;
    customer: { name: string };
    appointment: { startsAt: Date } | null;
  }): MessageLogResponseDto {
    return {
      id: entity.id,
      customerId: entity.customerId,
      customerName: entity.customer.name,
      appointmentId: entity.appointmentId,
      appointmentAt: entity.appointment?.startsAt ?? null,
      type: entity.type as MsgType,
      deliveryStatus: entity.deliveryStatus as DeliveryStatus,
      deliveryLabel: DELIVERY_STATUS_LABEL[entity.deliveryStatus as DeliveryStatus],
      errorMessage: entity.errorMessage,
      sentAt: entity.sentAt,
    };
  }
}

/** ยอดรวมที่แสดงเหนือรายการ — หลักฐานว่าระบบเคารพความยินยอมจริง ไม่ใช่แค่คำโฆษณา */
export class MessageStatsDto {
  @ApiProperty()
  sent: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ description: 'ไม่ส่งเพราะยังไม่ได้ให้ความยินยอม' })
  skippedNoConsent: number;

  @ApiProperty({ description: 'ไม่ส่งเพราะยังไม่ได้ผูก LINE' })
  skippedNoLine: number;

  @ApiProperty({ description: 'ไม่ส่งเพราะส่งไปแล้ว' })
  skippedDuplicate: number;
}

export type MessageFeed = PaginatedResponse<MessageLogResponseDto> & { stats: MessageStatsDto };
