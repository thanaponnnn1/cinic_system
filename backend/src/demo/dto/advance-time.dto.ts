import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** ข้ามได้ไกลสุดครั้งละ 30 วัน — เดโมไม่มีเหตุให้ไกลกว่านี้ และกันกดพลาดจนข้อมูลเพี้ยนยาว */
const MAX_MINUTES = 30 * 24 * 60;

export class AdvanceTimeDto {
  @ApiPropertyOptional({
    default: 1440,
    minimum: 1,
    maximum: MAX_MINUTES,
    description: 'ข้ามเวลาไปข้างหน้ากี่นาที — ไม่ระบุคือ 1 วัน',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_MINUTES)
  minutes?: number;
}
