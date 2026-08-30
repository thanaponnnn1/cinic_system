import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { LineMessagingModule } from '../line/line-messaging.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseExpiryService } from './course-expiry.service';

/**
 * คอร์สทั้งก้อน — ทั้งงานฝั่งหน้าจอและงานเตือนคอร์สใกล้หมดอายุตามรอบเวลา
 *
 * ตัวตัดครั้งคอร์สไม่ได้อยู่ที่นี่ แต่อยู่ในธุรกรรมปิดงานของโมดูลนัดหมาย เพราะการตัดครั้ง
 * ต้องเกิดพร้อมกับการปิดนัดในธุรกรรมเดียวกัน ไม่ใช่สองคำสั่งที่พลาดได้ทีละครึ่ง
 */
@Module({
  imports: [LineMessagingModule, ClockModule],
  controllers: [CoursesController],
  providers: [CoursesService, CourseExpiryService],
  exports: [CourseExpiryService],
})
export class CoursesModule {}
