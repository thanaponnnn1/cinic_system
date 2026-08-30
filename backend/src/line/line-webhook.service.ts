import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APPT_STATUS_LABEL, type ApptStatus, DeliveryStatus, MsgType } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { WaitlistEngineService, type ClaimResult } from '../waitlist/waitlist-engine.service';
import type { LineActionAppointment, LineActionResult } from '../appointments/line-action.types';
import { formatBangkokTime, formatThaiDate } from '../common/bangkok-time';
import { LineMessagingService } from './line-messaging.service';
import { extractLinkCode } from './link-code';
import { PostbackAction, parsePostback } from './postback-data';
import {
  eventUserId,
  type LineMessageEvent,
  type LinePostbackEvent,
  type LineWebhookEvent,
} from './line-webhook.types';

/**
 * ข้อความที่บอทตอบในแชท
 *
 * รวมไว้ที่เดียวเพราะเป็นเสียงของร้านที่ลูกค้าได้ยิน — เจ้าของร้านขอแก้คำเมื่อไหร่
 * ต้องแก้จบในไฟล์เดียว และห้ามมีรายละเอียดการรักษาโผล่ในข้อความใด ๆ (PDPA)
 */
export const LINE_REPLY = {
  linked: (name: string) =>
    `เชื่อมต่อสำเร็จ คุณ${name} 🙏\nจากนี้เราจะแจ้งเตือนนัดของคุณผ่านแชทนี้ และคุณกดยืนยันหรือขอเลื่อนนัดได้จากในข้อความได้เลย`,
  codeNotFound:
    'รหัสนี้ใช้ไม่ได้แล้วครับ 🙏\nรหัสเชื่อมบัญชีใช้ได้ครั้งเดียว รบกวนขอรหัสใหม่จากทางร้านอีกครั้งนะครับ',
  alreadyLinkedToOther:
    'บัญชี LINE นี้ผูกกับข้อมูลลูกค้าอีกท่านอยู่แล้วครับ 🙏\nรบกวนติดต่อทางร้านเพื่อตรวจสอบให้อีกครั้งนะครับ',
  fallback:
    'ขอบคุณที่ทักมาครับ 🙏\nแชทนี้ใช้สำหรับแจ้งเตือนนัดอัตโนมัติ หากต้องการจองคิว เลื่อนนัด หรือสอบถามเพิ่มเติม รบกวนติดต่อทางร้านโดยตรงนะครับ',

  confirmed: (appointment: LineActionAppointment) =>
    `ยืนยันเรียบร้อยแล้วครับ 🙏\n${describeAppointment(appointment)}\nแล้วพบกันครับ`,
  rescheduleReceived:
    'รับเรื่องขอเลื่อนนัดแล้วครับ 🙏\nทางร้านจะติดต่อกลับเพื่อนัดเวลาใหม่ให้โดยเร็วที่สุดครับ',
  alreadyConfirmed: 'นัดนี้ยืนยันไว้แล้วครับ 🙏 ไม่ต้องกดซ้ำนะครับ',
  alreadyRescheduling:
    'ทางร้านรับเรื่องขอเลื่อนนัดของคุณไว้แล้วครับ 🙏 รอทางร้านติดต่อกลับได้เลยครับ',
  cannotChange: (current: ApptStatus) =>
    `ขออภัยครับ ตอนนี้นัดของคุณอยู่ในสถานะ "${APPT_STATUS_LABEL[current]}" จึงเปลี่ยนจากในแชทไม่ได้ 🙏\nรบกวนติดต่อทางร้านโดยตรงเพื่อให้พนักงานช่วยจัดการให้นะครับ`,
  notYours:
    'ขออภัยครับ ปุ่มนี้ใช้กับบัญชีนี้ไม่ได้ 🙏\nรบกวนติดต่อทางร้านเพื่อตรวจสอบให้อีกครั้งนะครับ',
  appointmentGone: 'ไม่พบนัดนี้ในระบบแล้วครับ 🙏\nรบกวนติดต่อทางร้านเพื่อตรวจสอบอีกครั้งนะครับ',

  slotWon: (slot: { slotStart: Date; providerName: string; serviceName: string }) =>
    `จองคิวสำเร็จแล้วครับ 🎉\n${formatThaiDate(slot.slotStart)} เวลา ${formatBangkokTime(slot.slotStart)} น. กับ${slot.providerName}\nบริการ: ${slot.serviceName}\nแล้วพบกันครับ`,
  slotTaken:
    'ขออภัยครับ คิวนี้มีผู้จองแล้ว 🙏\nคุณยังอยู่ในคิวรอเหมือนเดิม มีคิวว่างครั้งหน้าเราจะรีบแจ้งให้ทราบทันทีครับ',
  slotExpired:
    'ขออภัยครับ ข้อเสนอคิวนี้หมดเวลาแล้ว 🙏\nคุณยังอยู่ในคิวรอ รอบหน้ามีคิวว่างเราจะแจ้งอีกครั้งครับ',
  slotAlreadyYours: 'คุณจองคิวนี้ไว้แล้วครับ 🙏 ไม่ต้องกดซ้ำนะครับ แล้วพบกันตามเวลาที่นัดไว้ครับ',
  slotNotYours:
    'ขออภัยครับ ปุ่มนี้ใช้กับบัญชีนี้ไม่ได้ 🙏\nรบกวนติดต่อทางร้านเพื่อตรวจสอบอีกครั้งนะครับ',
  slotGone: 'ไม่พบข้อเสนอคิวนี้แล้วครับ 🙏\nรบกวนติดต่อทางร้านเพื่อตรวจสอบอีกครั้งนะครับ',
} as const;

/** ข้อความบอกร้านว่าคิวที่ว่างถูกคว้าไปแล้ว — ตารางวันนั้นเพิ่งเปลี่ยน */
function adminSlotClaimedAlert(slot: {
  slotStart: Date;
  providerName: string;
  serviceName: string;
}): string {
  return (
    '⚡ มีลูกค้าคว้าคิวว่างไปแล้ว\n' +
    `${formatThaiDate(slot.slotStart)} เวลา ${formatBangkokTime(slot.slotStart)} น. กับ${slot.providerName}\n` +
    `บริการ: ${slot.serviceName}`
  );
}

/** ข้อความแจ้งพนักงานร้าน — ต้องบอกครบว่าใครต้องทำอะไรต่อ โดยไม่มีข้อมูลอ่อนไหว */
function adminRescheduleAlert(appointment: LineActionAppointment): string {
  return (
    '🔄 มีลูกค้าขอเลื่อนนัดผ่าน LINE\n' +
    `${describeAppointment(appointment)}\n` +
    `บริการ: ${appointment.serviceName}\n` +
    'รบกวนติดต่อกลับเพื่อนัดเวลาใหม่ครับ'
  );
}

function describeAppointment(appointment: LineActionAppointment): string {
  const date = formatThaiDate(appointment.startsAt);
  const time = formatBangkokTime(appointment.startsAt);

  return `${date} เวลา ${time} น. กับ${appointment.providerName}`;
}

/**
 * ตัวจัดการอีเวนต์ที่ LINE ยิงเข้ามา
 *
 * หลักที่ยึด: ต้องตอบ 200 ให้ LINE เสมอและห้ามค้าง — LINE ตัดการเชื่อมต่อที่ช้าเกินไป
 * แล้วส่งซ้ำ ซึ่งจะกลายเป็นการทำงานซ้ำสองรอบ ดังนั้นอีเวนต์ที่พังต้องจบในตัวมันเอง
 * ไม่ลามไปล้มอีเวนต์อื่นในชุดเดียวกัน
 */
@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly appointments: AppointmentsService,
    private readonly waitlist: WaitlistEngineService,
    private readonly config: ConfigService,
  ) {}

  async handleEvents(events: LineWebhookEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.handleEvent(event);
      } catch (error) {
        // กลืน error ไว้ตรงนี้ตั้งใจ — อีเวนต์ถัดไปในชุดเดียวกันเป็นของลูกค้าคนอื่น
        this.logger.error(
          `ประมวลผลอีเวนต์ ${event.type} ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async handleEvent(event: LineWebhookEvent): Promise<void> {
    if (event.type === 'message') {
      await this.handleMessage(event as LineMessageEvent);
      return;
    }

    if (event.type === 'postback') {
      await this.handlePostback(event as LinePostbackEvent);
    }
    // อีเวนต์ชนิดอื่น (unfollow, join, ...) ยังไม่มีงานที่ต้องทำใน MVP
  }

  /**
   * ลูกค้ากดปุ่มในข้อความเตือนนัด
   *
   * data ที่ได้มาจากฝั่งนอกทั้งหมด จึงตรวจรูปแบบก่อนเสมอ และให้ AppointmentsService
   * เป็นคนตรวจว่าบัญชีที่กดเป็นเจ้าของนัดจริงไหม — ที่นี่มีหน้าที่แปลผลเป็นคำพูดเท่านั้น
   */
  private async handlePostback(event: LinePostbackEvent): Promise<void> {
    const replyToken = event.replyToken;
    const lineUserId = eventUserId(event);
    const payload = parsePostback(event.postback?.data ?? '');

    if (!replyToken || !lineUserId) return;

    if (!payload) {
      this.logger.warn('ได้รับ postback ที่รูปแบบไม่ตรงกับปุ่มของระบบ');
      await this.line.replyText(replyToken, LINE_REPLY.fallback);
      return;
    }

    if (payload.action === PostbackAction.CLAIM_SLOT) {
      await this.handleClaimSlot(payload.waitlistEntryId, lineUserId, replyToken);
      return;
    }

    const isConfirm = payload.action === PostbackAction.CONFIRM;
    const result = isConfirm
      ? await this.appointments.confirmFromLine(payload.appointmentId, lineUserId)
      : await this.appointments.requestRescheduleFromLine(payload.appointmentId, lineUserId);

    await this.line.replyText(replyToken, this.describeResult(result, isConfirm));

    // เด้งบอกร้านเฉพาะเรื่องที่ต้องลงมือทำต่อ — ยืนยันนัดไม่ต้องรบกวนใคร
    if (!isConfirm && result.status === 'ok') {
      await this.notifyAdmin(adminRescheduleAlert(result.appointment));
    }
  }

  /**
   * ลูกค้ากด "จองคิวนี้" จากข้อความคิวว่าง
   *
   * ที่นี่ไม่ตัดสินใจอะไรเลยว่าใครได้คิว — WaitlistEngineService เป็นคนตัดสินในธุรกรรมเดียว
   * หน้าที่ตรงนี้คือแปลผลเป็นคำพูด และบอกร้านเมื่อตารางเปลี่ยน
   */
  private async handleClaimSlot(
    waitlistEntryId: string,
    lineUserId: string,
    replyToken: string,
  ): Promise<void> {
    const result = await this.waitlist.claim(waitlistEntryId, lineUserId);

    await this.line.replyText(replyToken, describeClaim(result));

    if (result.status === 'ok') {
      await this.notifyAdmin(adminSlotClaimedAlert(result));
    }
  }

  private describeResult(result: LineActionResult, isConfirm: boolean): string {
    switch (result.status) {
      case 'ok':
        return isConfirm ? LINE_REPLY.confirmed(result.appointment) : LINE_REPLY.rescheduleReceived;
      case 'unchanged':
        return isConfirm ? LINE_REPLY.alreadyConfirmed : LINE_REPLY.alreadyRescheduling;
      case 'invalid':
        return LINE_REPLY.cannotChange(result.current);
      case 'forbidden':
        return LINE_REPLY.notYours;
      case 'not_found':
        return LINE_REPLY.appointmentGone;
    }
  }

  /** ส่งเรื่องที่ร้านต้องรู้เข้า LINE ของแอดมิน — ไม่ได้ตั้งค่าไว้ก็แค่ข้ามไป ไม่ทำให้ flow ลูกค้าพัง */
  private async notifyAdmin(text: string): Promise<void> {
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');

    if (!adminUserId) {
      this.logger.warn('ยังไม่ได้ตั้ง LINE_ADMIN_USER_ID — ไม่มีใครได้รับแจ้งเรื่องขอเลื่อนนัด');
      return;
    }

    await this.line.pushText(adminUserId, text);
  }

  private async handleMessage(event: LineMessageEvent): Promise<void> {
    const replyToken = event.replyToken;
    const lineUserId = eventUserId(event);

    if (!replyToken || !lineUserId || event.message.type !== 'text') return;

    const code = extractLinkCode(event.message.text);

    if (!code) {
      await this.line.replyText(replyToken, LINE_REPLY.fallback);
      return;
    }

    await this.linkAccount(code, lineUserId, replyToken);
  }

  /**
   * ผูกบัญชี LINE เข้ากับลูกค้าที่ถือรหัสนั้น
   *
   * รหัสใช้ได้ครั้งเดียวจริง ๆ เพราะล้างทิ้งพร้อมกับการผูกในคำสั่งเดียว
   */
  private async linkAccount(code: string, lineUserId: string, replyToken: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { linkCode: code, isActive: true },
      select: { id: true, name: true },
    });

    if (!customer) {
      await this.line.replyText(replyToken, LINE_REPLY.codeNotFound);
      return;
    }

    // lineUserId เป็น unique ในฐานข้อมูล ถ้าไม่เช็กก่อนจะได้ error ดิบ ๆ แทนคำตอบที่ลูกค้าอ่านรู้เรื่อง
    const owner = await this.prisma.customer.findUnique({
      where: { lineUserId },
      select: { id: true },
    });

    if (owner && owner.id !== customer.id) {
      this.logger.warn(
        `บัญชี LINE ผูกกับลูกค้า ${owner.id} อยู่แล้ว จึงไม่ผูกซ้ำให้ ${customer.id}`,
      );
      await this.line.replyText(replyToken, LINE_REPLY.alreadyLinkedToOther);
      return;
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lineUserId, linkCode: null },
    });

    await this.line.replyText(replyToken, LINE_REPLY.linked(customer.name));

    await this.prisma.messageLog.create({
      data: {
        customerId: customer.id,
        type: MsgType.LINK_CONFIRM,
        deliveryStatus: DeliveryStatus.SENT,
      },
    });
  }
}

/** แปลผลการแย่งคิวเป็นข้อความที่ลูกค้าอ่านแล้วรู้ว่าต้องทำอะไรต่อ */
function describeClaim(result: ClaimResult): string {
  switch (result.status) {
    case 'ok':
      return LINE_REPLY.slotWon(result);
    case 'taken':
      return LINE_REPLY.slotTaken;
    case 'expired':
      return LINE_REPLY.slotExpired;
    case 'already_claimed':
      return LINE_REPLY.slotAlreadyYours;
    case 'forbidden':
      return LINE_REPLY.slotNotYours;
    case 'not_found':
      return LINE_REPLY.slotGone;
  }
}
