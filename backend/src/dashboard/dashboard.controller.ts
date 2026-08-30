import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DailySummaryDto, DashboardKpiDto, SummaryQueryDto } from './dto/dashboard.dto';

@ApiTags('สรุปภาพรวม')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'สรุปของวันเดียว แยกตามช่าง',
    description: 'รายได้จริง รายได้ที่คาดว่าจะได้ เคสที่ปิดงาน ไม่มาตามนัด และคิวของพรุ่งนี้',
  })
  summary(@Query() query: SummaryQueryDto): Promise<DailySummaryDto> {
    return this.dashboard.summary(query);
  }

  @Get('kpi')
  @ApiOperation({
    summary: 'การ์ด 4 ใบหน้าแรก + รายได้ย้อนหลัง 7 วัน',
    description: 'ทุกตัวเลขนับสดจากนัดและผลแคมเปญ ไม่มีตารางสรุปแยกให้ข้อมูลเพี้ยนกัน',
  })
  kpi(): Promise<DashboardKpiDto> {
    return this.dashboard.kpi();
  }
}
