import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * ตัวเลขของหน้าสรุปและการ์ดหน้าแรก
 *
 * อ่านอย่างเดียว ไม่มีการเขียนใด ๆ — สิทธิ์ทุกระดับรวมถึง VIEWER เรียกได้ เพราะเป็นยอดรวม
 * ที่ไม่มีข้อมูลติดต่อลูกค้าอยู่ในนั้นเลย
 */
@Module({
  imports: [ClockModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
