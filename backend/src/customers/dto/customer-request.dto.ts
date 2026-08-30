import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'สมหญิง ใจดี' })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อลูกค้า' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: '0812345678', description: 'เบอร์มือถือ 10 หลัก' })
  @IsString()
  // เก็บเป็นตัวเลขล้วนเสมอ เพื่อให้ค้นหาและกันเบอร์ซ้ำได้จริง
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(/^0\d{8,9}$/, { message: 'เบอร์โทรไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก)' })
  phone: string;

  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความเตือนนัด', default: false })
  @IsOptional()
  @IsBoolean()
  consentReminder?: boolean;

  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความการตลาด', default: false })
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;

  @ApiPropertyOptional({ description: 'บันทึกทั่วไป — ห้ามใส่ข้อมูลการรักษา' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** แก้ไขข้อมูลลูกค้า — ความยินยอมมี endpoint แยกต่างหาก จึงตัดออกจากตัวนี้ */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['consentReminder', 'consentMarketing'] as const),
) {}

/**
 * แก้ไขความยินยอม
 *
 * แยกออกมาจาก UpdateCustomerDto โดยตั้งใจ เพราะการเปลี่ยนความยินยอมต้องบันทึก
 * `consentAt` ใหม่เสมอ และควรเป็นการกระทำที่จงใจ ไม่ใช่ผลพลอยได้จากการแก้ชื่อหรือเบอร์
 */
export class UpdateConsentDto {
  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความเตือนนัด' })
  @IsOptional()
  @IsBoolean()
  consentReminder?: boolean;

  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความการตลาด' })
  @IsOptional()
  @IsBoolean()
  consentMarketing?: boolean;
}

export class FindCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ค้นจากชื่อหรือเบอร์โทร' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'กรองเฉพาะลูกค้าที่ไม่ได้มาเกินกี่วัน (เช่น 90 สำหรับแคมเปญดึงลูกค้ากลับ)',
  })
  @IsOptional()
  @Type(() => Number)
  inactiveDays?: number;

  @ApiPropertyOptional({ description: 'รวมลูกค้าที่ปิดการใช้งานแล้วด้วย', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}
