import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Role } from '@clinicq/shared';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

// ── แม่แบบคอร์สที่ร้านขาย ────────────────────────────────

export class CreateCoursePackageDto {
  @ApiProperty({ example: 'คอร์สทรีตเมนต์ผิวหน้า 10 ครั้ง' })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อคอร์ส' })
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ description: 'บริการที่คอร์สนี้ผูกอยู่ — ไม่ระบุ = ใช้กับบริการใดก็ได้' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiProperty({ example: 10, description: 'จำนวนครั้งทั้งหมดของคอร์ส' })
  @Type(() => Number)
  @IsInt({ message: 'จำนวนครั้งต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'คอร์สต้องมีอย่างน้อย 1 ครั้ง' })
  @Max(100)
  totalSessions: number;

  @ApiProperty({ example: 180, description: 'อายุคอร์สเป็นวัน นับจากวันที่ซื้อ' })
  @Type(() => Number)
  @IsInt({ message: 'อายุคอร์สต้องเป็นจำนวนเต็มวัน' })
  @Min(1, { message: 'อายุคอร์สต้องอย่างน้อย 1 วัน' })
  @Max(3650)
  validDays: number;

  @ApiProperty({ example: 12000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'ราคาต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง' })
  @Min(0, { message: 'ราคาต้องไม่ติดลบ' })
  price: number;
}

export class UpdateCoursePackageDto extends PartialType(CreateCoursePackageDto) {}

export class FindCoursePackagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'รวมคอร์สที่เลิกขายแล้วด้วย', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}

export class CoursePackageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  serviceId: string | null;

  @ApiPropertyOptional()
  serviceName: string | null;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  validDays: number;

  @ApiProperty({ description: 'ราคาเป็นตัวเลข ไม่ใช่ข้อความ' })
  price: number;

  @ApiProperty()
  isActive: boolean;

  static from(entity: {
    id: string;
    name: string;
    serviceId: string | null;
    totalSessions: number;
    validDays: number;
    price: { toString(): string };
    isActive: boolean;
    service?: { name: string } | null;
  }): CoursePackageResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      serviceId: entity.serviceId,
      serviceName: entity.service?.name ?? null,
      totalSessions: entity.totalSessions,
      validDays: entity.validDays,
      // Prisma คืน Decimal มาเป็นออบเจ็กต์ ไม่ใช่ number จึงต้องแปลงก่อนส่งออก
      price: Number(entity.price.toString()),
      isActive: entity.isActive,
    };
  }
}

// ── คอร์สที่ลูกค้าซื้อไปแล้ว ──────────────────────────────

export class PurchaseCourseDto {
  @ApiProperty()
  @IsString()
  customerId: string;

  @ApiProperty()
  @IsString()
  packageId: string;

  @ApiPropertyOptional({
    example: '2026-09-01T10:00:00+07:00',
    description: 'ไม่ระบุ = ตอนนี้ — ใช้ตอนบันทึกย้อนหลังให้คอร์สที่ขายไปก่อนมีระบบ',
  })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;
}

export class FindCustomerCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'รวมคอร์สที่หมดอายุแล้วด้วย — คอร์สที่ใช้ครบครั้งแล้วยังแสดงเสมอ (ครั้งเหลือ = 0)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeExpired?: boolean = false;
}

export class ExpiringCoursesQueryDto {
  @ApiPropertyOptional({ default: 30, description: 'เหลืออายุไม่เกินกี่วัน' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'จำนวนวันต้องเป็นจำนวนเต็ม' })
  @Min(1)
  @Max(365)
  days?: number = 30;
}

/** รูปร่างของคอร์สที่ลูกค้าซื้อ เท่าที่ DTO นี้ใช้ */
interface CustomerCourseEntity {
  id: string;
  customerId: string;
  packageId: string;
  usedSessions: number;
  purchasedAt: Date;
  expiresAt: Date;
  customer: { name: string; phone: string };
  package: { name: string; totalSessions: number };
}

export class CustomerCourseResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional({ description: 'ระดับ VIEWER จะไม่ได้รับฟิลด์นี้' })
  customerPhone?: string;

  @ApiProperty()
  packageId: string;

  @ApiProperty()
  packageName: string;

  @ApiProperty()
  totalSessions: number;

  @ApiProperty()
  usedSessions: number;

  @ApiProperty({ description: 'ครั้งที่เหลือ — ตัวเลขที่ร้านใช้ตัดสินใจว่าควรโทรตามใครก่อน' })
  remainingSessions: number;

  @ApiProperty()
  purchasedAt: Date;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ description: 'เหลืออีกกี่วันถึงหมดอายุ — ติดลบคือหมดอายุไปแล้ว' })
  daysLeft: number;

  static from(
    entity: CustomerCourseEntity,
    viewerRole: Role,
    now: Date = new Date(),
  ): CustomerCourseResponseDto {
    const base: CustomerCourseResponseDto = {
      id: entity.id,
      customerId: entity.customerId,
      customerName: entity.customer.name,
      packageId: entity.packageId,
      packageName: entity.package.name,
      totalSessions: entity.package.totalSessions,
      usedSessions: entity.usedSessions,
      remainingSessions: Math.max(0, entity.package.totalSessions - entity.usedSessions),
      purchasedAt: entity.purchasedAt,
      expiresAt: entity.expiresAt,
      daysLeft: daysBetween(now, entity.expiresAt),
    };

    // เบอร์โทรอยู่ในลิสต์นี้เพราะมันคือรายชื่อที่ร้านต้องโทรตาม — แต่ VIEWER ไม่มีเหตุผล
    // ทางธุรกิจที่ต้องเห็น เหมือนกับหน้าลูกค้า (ข้อกำหนด PDPA)
    if (viewerRole === Role.VIEWER) return base;

    return { ...base, customerPhone: entity.customer.phone };
  }
}

/** จำนวนวันเต็มระหว่างสองเวลา ปัดขึ้นเพื่อให้ "อีก 0 วัน" แปลว่าหมดอายุวันนี้จริง ๆ */
export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}
