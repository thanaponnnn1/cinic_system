import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { IsImageUrl } from '../../common/dto/image-url.decorator';
import { IsSlug } from '../../common/dto/slug.decorator';

export class CreateServiceDto {
  @ApiProperty({
    example: 'ทรีตเมนต์บำรุงผิวหน้า',
    description: 'ใช้ชื่อกลาง ๆ ที่ไม่สื่อถึงอาการหรือการรักษา เพราะชื่อนี้จะไปปรากฏในระบบหลายที่',
  })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อบริการ' })
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: 60, description: 'ระยะเวลาเป็นนาที ใช้คำนวณเวลาสิ้นสุดของนัด' })
  @Type(() => Number)
  @IsInt({ message: 'ระยะเวลาต้องเป็นจำนวนเต็มนาที' })
  @Min(5, { message: 'ระยะเวลาต้องอย่างน้อย 5 นาที' })
  @Max(600, { message: 'ระยะเวลาต้องไม่เกิน 600 นาที' })
  durationMin: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'ราคาต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง' })
  @Min(0, { message: 'ราคาต้องไม่ติดลบ' })
  price: number;

  @ApiPropertyOptional({
    example: '/demo/svc-facial-treatment.webp',
    description: 'รูปที่หน้าร้านฝั่งลูกค้าแสดง — path ในเว็บของร้าน หรือ URL https',
  })
  @IsImageUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'facial-treatment',
    description: 'ชื่อในลิงก์จากเว็บร้าน /c/book?service=<slug> ห้ามซ้ำกับบริการอื่น',
  })
  @IsSlug()
  slug?: string;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class FindServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'รวมบริการที่ปิดการใช้งานแล้วด้วย', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}

export class ServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  durationMin: number;

  @ApiProperty({ description: 'ราคาเป็นตัวเลข ไม่ใช่ข้อความ' })
  price: number;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiPropertyOptional()
  slug: string | null;

  @ApiProperty()
  isActive: boolean;

  static from(entity: {
    id: string;
    name: string;
    durationMin: number;
    // Prisma คืน Decimal มาเป็นออบเจ็กต์ ไม่ใช่ number จึงต้องแปลงก่อนส่งออก
    price: { toString(): string };
    imageUrl: string | null;
    slug: string | null;
    isActive: boolean;
  }): ServiceResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      durationMin: entity.durationMin,
      price: Number(entity.price.toString()),
      imageUrl: entity.imageUrl,
      slug: entity.slug,
      isActive: entity.isActive,
    };
  }
}
