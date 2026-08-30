import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { DeliveryStatus } from '@clinicq/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { ClockService } from '../clock/clock.service';
import type { ReminderJobData } from './reminder-scheduler.service';

/**
 * ตัวทำงานจริงตอนงานเตือนนัดถึงกำหนด (ฝั่ง consumer)
 *
 * ตั้งใจไม่ตัดสินใจอะไรเองเลยเรื่องความยินยอมหรือสถานะนัด — ส่งต่อให้ NotificationsService
 * ซึ่งถือกฎเหล่านั้นอยู่ที่เดียว ที่นี่มีหน้าที่แค่ซิงก์เวลาและแยกว่า error ไหนควร retry
 */
@Injectable()
export class ReminderProcessorService {
  private readonly logger = new Logger(ReminderProcessorService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly clock: ClockService,
  ) {}

  async process(data: ReminderJobData): Promise<DeliveryStatus | null> {
    // ฝั่ง API เป็นคนกดข้ามเวลา worker จึงต้องอ่านค่าล่าสุดก่อนตัดสินใจทุกครั้ง
    await this.clock.refresh();

    try {
      const result = await this.notifications.sendAppointmentReminder(
        data.appointmentId,
        data.type,
      );
      this.logger.log(`เตือนนัด ${data.appointmentId} (${data.type}) → ${result}`);

      return result;
    } catch (error) {
      // นัดหายไปแล้วคือสถานการณ์ที่ retry ไปก็ไม่มีวันสำเร็จ ปิดงานเงียบ ๆ ดีกว่าปล่อยให้ค้างในคิว
      if (error instanceof NotFoundException) {
        this.logger.warn(`ข้ามงานเตือนนัด ${data.appointmentId} เพราะไม่พบนัดนี้แล้ว`);
        return null;
      }

      throw error;
    }
  }
}
