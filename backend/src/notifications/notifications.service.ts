import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ApptStatus, DeliveryStatus, MsgType } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { buildAppointmentReminderFlex } from '../line/appointment-flex';
import { NOTIFICATION_CHANNEL, type NotificationChannel } from './notification-channel';

/** สถานะที่ยังควรได้รับการเตือน — ยกเลิก/ไม่มา/จบแล้ว ไม่ต้องเตือนอีก */
const REMINDABLE: readonly ApptStatus[] = [ApptStatus.BOOKED, ApptStatus.CONFIRMED];

/**
 * ตัวกลางที่ตัดสินใจว่า "ส่งหรือไม่ส่ง" แล้วบันทึกเหตุผลไว้เสมอ
 *
 * กฎทั้งหมดรวมอยู่ที่นี่ที่เดียว ไม่ว่าใครจะเป็นคนสั่งส่ง (คิวเตือนนัด, ปุ่มบน dashboard,
 * แคมเปญดึงลูกค้ากลับ) เพื่อให้ไม่มีทางที่ข้อความจะออกไปโดยข้ามการตรวจความยินยอม
 *
 * ทุกเส้นทางจบด้วยการเขียน MessageLog — แถวที่ SKIPPED_* คือหลักฐานตาม PDPA ว่าระบบ
 * ไม่ได้ส่งหาคนที่ไม่ยินยอม ซึ่งเปิดให้เจ้าของคลินิกดูได้ตรง ๆ
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CHANNEL) private readonly channel: NotificationChannel,
  ) {}

  async sendAppointmentReminder(appointmentId: string, type: MsgType): Promise<DeliveryStatus> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: { select: { id: true, name: true, lineUserId: true, consentReminder: true } },
        provider: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    if (!appointment) throw new NotFoundException('ไม่พบนัดหมายรายการนี้');

    const { customer } = appointment;

    if (!REMINDABLE.includes(appointment.status as ApptStatus)) {
      this.logger.log(`ข้ามการเตือนนัด ${appointmentId} เพราะสถานะเป็น ${appointment.status}`);
      return DeliveryStatus.SKIPPED_DUPLICATE;
    }

    // เคยส่งข้อความชนิดนี้ของนัดนี้สำเร็จแล้ว — คิวงานที่ทำงานซ้ำต้องไม่กลายเป็นข้อความซ้ำ
    const alreadySent = await this.prisma.messageLog.findFirst({
      where: { appointmentId, type, deliveryStatus: DeliveryStatus.SENT },
      select: { id: true },
    });

    if (alreadySent) return DeliveryStatus.SKIPPED_DUPLICATE;

    if (!customer.lineUserId) {
      return this.record(customer.id, appointmentId, type, DeliveryStatus.SKIPPED_NO_LINE);
    }

    if (!customer.consentReminder) {
      return this.record(customer.id, appointmentId, type, DeliveryStatus.SKIPPED_NO_CONSENT);
    }

    const flex = buildAppointmentReminderFlex(
      {
        appointmentId: appointment.id,
        customerName: customer.name,
        serviceName: appointment.service.name,
        providerName: appointment.provider.name,
        startsAt: appointment.startsAt,
      },
      type,
    );

    const sent = await this.channel.send(customer.lineUserId, {
      text: flex.altText,
      flex,
    });

    return this.record(
      customer.id,
      appointmentId,
      type,
      sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
      sent ? null : `ส่งผ่านช่องทาง ${this.channel.name} ไม่สำเร็จ`,
    );
  }

  private async record(
    customerId: string,
    appointmentId: string,
    type: MsgType,
    deliveryStatus: DeliveryStatus,
    errorMessage: string | null = null,
  ): Promise<DeliveryStatus> {
    await this.prisma.messageLog.create({
      data: { customerId, appointmentId, type, deliveryStatus, errorMessage },
    });

    return deliveryStatus;
  }
}
