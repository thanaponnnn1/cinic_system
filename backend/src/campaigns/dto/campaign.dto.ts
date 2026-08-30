import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

/** ตัวแทนชื่อลูกค้าในข้อความแคมเปญ — ระบบแทนค่าให้ตอนส่ง */
export const NAME_PLACEHOLDER = '{name}';

export class CreateCampaignDto {
  @ApiProperty({ example: 'ดึงลูกค้ากลับ — ส่วนลด 15%' })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อแคมเปญ' })
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    example:
      '💌 คิดถึงคุณ {name} จังเลยค่ะ\nไม่ได้เจอกันนาน THNP Clinic มีส่วนลดพิเศษ 15% ให้ถึงสิ้นเดือนนี้\nทักแชทนี้เพื่อจองคิวได้เลยค่ะ',
    description:
      'ข้อความที่จะส่ง ใส่ {name} ตรงที่อยากให้แทนด้วยชื่อลูกค้า — ห้ามมีรายละเอียดการรักษา',
  })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุข้อความที่จะส่ง' })
  // LINE ตัดข้อความที่ยาวเกิน 5,000 ตัวอักษรทิ้งทั้งฉบับ กันไว้ตั้งแต่ตอนตั้งค่า
  @MaxLength(4000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;

  @ApiPropertyOptional({
    example: 90,
    default: 90,
    description: 'ไม่ได้มารับบริการเกินกี่วันถึงเข้าเกณฑ์',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'จำนวนวันต้องเป็นจำนวนเต็ม' })
  @Min(7, { message: 'ต้องหายไปอย่างน้อย 7 วันถึงจะเรียกว่าลูกค้าหาย' })
  @Max(3650)
  inactiveDays?: number = 90;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional({ description: 'ปิด/เปิดแคมเปญ — ปิดแล้วงานรายวันจะข้ามแคมเปญนี้' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FindCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'รวมแคมเปญที่ปิดอยู่ด้วย', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  inactiveDays: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  static from(entity: {
    id: string;
    name: string;
    message: string;
    inactiveDays: number;
    isActive: boolean;
    createdAt: Date;
  }): CampaignResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      message: entity.message,
      inactiveDays: entity.inactiveDays,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    };
  }
}

/**
 * ผลของแคมเปญ — สไลด์ที่ใช้ปิดการขาย
 *
 * ตัวเลขทุกตัวคำนวณจาก CampaignRun ตรง ๆ ไม่มีตารางสรุปแยก จึงไม่มีทางที่หน้าจอ
 * กับฐานข้อมูลจะเล่าคนละเรื่องกัน
 */
export class CampaignResultsDto {
  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'ส่งข้อความไปกี่คน' })
  sent: number;

  @ApiProperty({ description: 'กลับมาจองกี่คน' })
  returned: number;

  @ApiProperty({ description: 'สัดส่วนคนที่กลับมา เป็นร้อยละ ทศนิยม 1 ตำแหน่ง' })
  returnRate: number;

  @ApiProperty({ description: 'รายได้รวมจากคนที่กลับมา (บาท)' })
  revenue: number;
}
