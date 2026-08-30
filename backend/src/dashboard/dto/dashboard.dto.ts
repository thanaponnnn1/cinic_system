import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class SummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'ไม่ระบุ = วันนี้ตามเวลาไทย' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD' })
  date?: string;
}

export class ProviderSummaryDto {
  @ApiProperty()
  providerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'เคสที่ปิดงานแล้ว' })
  completed: number;

  @ApiProperty({ description: 'คิวทั้งหมดที่ยังไม่ถูกยกเลิก' })
  booked: number;

  @ApiProperty()
  noShow: number;

  @ApiProperty({ description: 'รายได้จากเคสที่ปิดงานแล้ว (บาท)' })
  revenue: number;
}

/** สรุปของวันเดียว — ข้อมูลของหน้าสรุปรายวัน */
export class DailySummaryDto {
  @ApiProperty({ example: '2026-09-01' })
  date: string;

  @ApiProperty({ description: 'รายได้จริงจากเคสที่ปิดงานแล้ว' })
  revenue: number;

  @ApiProperty({ description: 'รายได้ที่คาดว่าจะได้ นับคิวที่ยังไม่ถูกยกเลิกทั้งหมด' })
  expectedRevenue: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  noShow: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty({ description: 'คิวของวันพรุ่งนี้ที่ยังไม่ถูกยกเลิก' })
  tomorrowCount: number;

  @ApiProperty({ type: [ProviderSummaryDto] })
  byProvider: ProviderSummaryDto[];
}

export class RevenuePointDto {
  @ApiProperty({ example: '2026-09-01' })
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  completed: number;
}

/**
 * การ์ด 4 ใบบนหน้าแรก
 *
 * ทุกตัวเลขต้องอธิบายที่มาได้ในประโยคเดียว ไม่งั้นเจ้าของร้านจะไม่เชื่อ และตัวเลขที่
 * อธิบายไม่ได้คือตัวเลขที่ใช้ปิดการขายไม่ได้
 */
export class DashboardKpiDto {
  @ApiProperty({ description: 'รายได้วันนี้จากเคสที่ปิดงานแล้ว' })
  todayRevenue: number;

  @ApiProperty({ description: 'รายได้เมื่อวาน ไว้เทียบให้เห็นทิศทาง' })
  yesterdayRevenue: number;

  @ApiProperty({ description: 'คิววันนี้ที่ยังไม่ถูกยกเลิก' })
  todayCases: number;

  @ApiProperty({ description: 'คิวที่หลุดแล้วมีคนในคิวรอกดรับแทนได้ นับเดือนนี้' })
  rescuedSlotsThisMonth: number;

  @ApiProperty({ description: 'ลูกค้าที่ได้รับข้อความแคมเปญแล้วกลับมาจอง นับเดือนนี้' })
  winbackReturnedThisMonth: number;

  @ApiProperty({ description: 'รายได้จากลูกค้ากลุ่มที่ดึงกลับมาได้ นับเดือนนี้' })
  winbackRevenueThisMonth: number;

  @ApiProperty({ description: 'ไม่มาตามนัดเดือนนี้ — ตัวเลขที่ระบบมีไว้กดให้ต่ำลง' })
  noShowThisMonth: number;

  @ApiProperty({ description: 'คอร์สที่ใกล้หมดอายุใน 30 วันและยังมีครั้งเหลือ' })
  expiringCourses: number;

  @ApiProperty({ type: [RevenuePointDto], description: 'รายได้ย้อนหลัง 7 วันรวมวันนี้' })
  last7Days: RevenuePointDto[];
}
