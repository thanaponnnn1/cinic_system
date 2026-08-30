import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { PaginatedResponse } from '@clinicq/shared';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'page ต้องเริ่มจาก 1' })
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit ต้องเป็นจำนวนเต็ม' })
  @Min(1)
  // จำกัดเพดานไว้กันคนขอทีเดียวหมดตาราง ซึ่งจะทำให้ทั้งระบบช้าตามไปด้วย
  @Max(100, { message: 'limit ต้องไม่เกิน 100 รายการต่อครั้ง' })
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/** ประกอบผลลัพธ์แบบแบ่งหน้าให้เป็นรูปแบบเดียวกันทุก endpoint */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
