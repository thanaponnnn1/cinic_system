import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateProviderDto {
  @ApiProperty({ example: 'คุณแนน' })
  @IsString()
  @MinLength(1, { message: 'ต้องระบุชื่อ' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ example: 'ช่างผู้เชี่ยวชาญ' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}

export class FindProvidersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'รวมผู้ที่ปิดการใช้งานแล้วด้วย', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;
}

export class ProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  title: string | null;

  @ApiProperty()
  isActive: boolean;

  static from(entity: {
    id: string;
    name: string;
    title: string | null;
    isActive: boolean;
  }): ProviderResponseDto {
    return { id: entity.id, name: entity.name, title: entity.title, isActive: entity.isActive };
  }
}
