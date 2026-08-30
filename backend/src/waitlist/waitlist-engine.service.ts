import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApptStatus, DeliveryStatus, MsgType, WaitlistStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { ClockService } from '../clock/clock.service';
import { buildSlotOfferFlex } from '../line/slot-offer-flex';
import { formatBangkokTime, formatThaiDate } from '../common/bangkok-time';
import { CampaignAttributionService } from '../campaigns/campaign-attribution.service';
import type { Prisma } from '../generated/prisma/client';

/** ให้เวลากดรับ 30 นาที — สั้นพอที่คิวจะไม่ถูกแช่ไว้เฉย ๆ ยาวพอที่คนทำงานอยู่จะเห็นข้อความ */
export const OFFER_TTL_MS = 30 * 60_000;

/** คิวว่างหนึ่งช่องที่เพิ่งเกิดขึ้นจากการยกเลิกนัด */
export interface OpenSlot {
  providerId: string;
  serviceId: string;
  slotStart: Date;
  slotEnd: Date;
}

export type ClaimResult =
  | {
      status: 'ok';
      appointmentId: string;
      slotStart: Date;
      providerName: string;
      serviceName: string;
    }
  /** ช้าไปหนึ่งก้าว มีคนอื่นได้คิวนี้ไปแล้ว */
  | { status: 'taken' }
  | { status: 'expired' }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'already_claimed' };

/** สถานะนัดที่ยังกินที่ในตาราง — ใช้ตอนเช็คว่าคิวยังว่างจริง */
const ACTIVE = [ApptStatus.BOOKED, ApptStatus.CONFIRMED];

/**
 * เครื่องยนต์ของคิวรอ — ท่อนที่เปลี่ยน "ช่องว่างในตาราง" เป็นรายได้
 *
 * หลักการที่ยึด: เสนอให้ทุกคนที่เข้าเกณฑ์พร้อมกัน แล้วให้คนที่กดก่อนได้ไป ไม่ใช่ไล่เสนอ
 * ทีละคนแล้วรอ เพราะคิวที่ว่างวันนี้ถ้ารอคนแรกตอบ 30 นาที คนที่เหลืออาจไม่ทันแล้ว
 *
 * ความปลอดภัยตอนแย่งกันกดมาจากสามชั้นซ้อนกัน: advisory lock ของช่าง, ตรวจว่าคิวยังว่าง
 * ในธุรกรรมเดียวกัน และการยึดใบจองด้วยเงื่อนไขสถานะเดิม (updateMany + count)
 */
@Injectable()
export class WaitlistEngineService {
  private readonly logger = new Logger(WaitlistEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly clock: ClockService,
    private readonly config: ConfigService,
    private readonly attribution: CampaignAttributionService,
  ) {}

  /**
   * เสนอคิวที่เพิ่งว่างให้ทุกคนในคิวรอที่ช่วงเวลาสะดวกครอบคิวนี้
   *
   * คืนจำนวนคนที่ได้รับข้อเสนอจริง (คนที่ยังไม่ผูก LINE หรือไม่ยินยอมจะถูกข้าม
   * พร้อมบันทึกเหตุผลไว้ใน MessageLog)
   */
  async offerSlot(slot: OpenSlot): Promise<number> {
    const candidates = await this.prisma.waitlistEntry.findMany({
      where: {
        status: WaitlistStatus.WAITING,
        serviceId: slot.serviceId,
        // ช่วงเวลาที่ลูกค้าบอกว่าสะดวกต้องครอบคิวนี้ทั้งช่อง ไม่ใช่แค่คาบเกี่ยว
        windowStart: { lte: slot.slotStart },
        windowEnd: { gte: slot.slotEnd },
      },
      include: {
        customer: { select: { id: true, name: true, lineUserId: true, consentReminder: true } },
        service: { select: { id: true, name: true, durationMin: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (candidates.length === 0) {
      this.logger.log('ไม่มีใครในคิวรอที่ตรงกับคิวที่ว่าง');
      return 0;
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: slot.providerId },
      select: { name: true },
    });
    const expiresAt = new Date(this.clock.now().getTime() + OFFER_TTL_MS);
    let offered = 0;

    for (const candidate of candidates) {
      const { customer } = candidate;

      if (!customer.lineUserId) {
        await this.log(customer.id, DeliveryStatus.SKIPPED_NO_LINE);
        continue;
      }

      if (!customer.consentReminder) {
        await this.log(customer.id, DeliveryStatus.SKIPPED_NO_CONSENT);
        continue;
      }

      await this.prisma.waitlistEntry.update({
        where: { id: candidate.id },
        data: {
          status: WaitlistStatus.OFFERED,
          offeredSlotAt: slot.slotStart,
          offeredProviderId: slot.providerId,
          offerExpiresAt: expiresAt,
        },
      });

      const flex = buildSlotOfferFlex({
        waitlistEntryId: candidate.id,
        customerName: customer.name,
        serviceName: candidate.service.name,
        providerName: provider?.name ?? 'ทีมงานของร้าน',
        slotStart: slot.slotStart,
        expiresAt,
      });

      const sent = await this.line.push(customer.lineUserId, [flex]);
      await this.log(
        customer.id,
        sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        sent ? null : 'ส่งข้อเสนอคิวว่างผ่าน LINE ไม่สำเร็จ',
      );

      if (sent) offered += 1;
    }

    this.logger.log(`เสนอคิวว่าง ${formatBangkokTime(slot.slotStart)} ให้ ${offered} คน`);

    return offered;
  }

  /**
   * ลูกค้ากดปุ่ม "จองคิวนี้"
   *
   * ทุกค่าที่ใช้สร้างนัดมาจากใบจองในฐานข้อมูล ไม่ใช่จาก postback ที่ลูกค้าส่งมา
   * ไม่งั้นคนที่แก้ data ของปุ่มจะจองข้ามช่างหรือข้ามเวลาได้
   */
  async claim(waitlistEntryId: string, lineUserId: string): Promise<ClaimResult> {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id: waitlistEntryId },
      include: {
        customer: { select: { id: true, lineUserId: true } },
        service: { select: { name: true, durationMin: true } },
      },
    });

    if (!entry) return { status: 'not_found' };
    if (entry.customer.lineUserId !== lineUserId) return { status: 'forbidden' };
    if (entry.status === WaitlistStatus.CLAIMED) return { status: 'already_claimed' };
    if (entry.status !== WaitlistStatus.OFFERED) return { status: 'taken' };
    if (!entry.offeredSlotAt || !entry.offeredProviderId) return { status: 'taken' };
    if (entry.offerExpiresAt && entry.offerExpiresAt.getTime() < this.clock.now().getTime()) {
      return { status: 'expired' };
    }

    const slotStart = entry.offeredSlotAt;
    const slotEnd = new Date(slotStart.getTime() + entry.service.durationMin * 60_000);
    const providerId = entry.offeredProviderId;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // ล็อกช่างก่อน ทำให้คนที่กดพร้อมกันเข้ามาทีละคนจริง ๆ ไม่ใช่แค่หวังว่าจะไม่ชน
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${providerId}))`;

      const clash = await tx.appointment.findFirst({
        where: {
          providerId,
          status: { in: ACTIVE },
          startsAt: { lt: slotEnd },
          endsAt: { gt: slotStart },
        },
        select: { id: true },
      });

      if (clash) return { status: 'taken' } as ClaimResult;

      // ยึดใบจองแบบมีเงื่อนไขสถานะเดิม — คนที่มาทีหลังจะได้ count = 0
      const { count } = await tx.waitlistEntry.updateMany({
        where: { id: entry.id, status: WaitlistStatus.OFFERED },
        data: { status: WaitlistStatus.CLAIMED },
      });

      if (count === 0) return { status: 'taken' } as ClaimResult;

      const appointment = await tx.appointment.create({
        data: {
          customerId: entry.customer.id,
          providerId,
          serviceId: entry.serviceId,
          startsAt: slotStart,
          endsAt: slotEnd,
          status: ApptStatus.BOOKED,
        },
      });

      // คนอื่นที่ได้ข้อเสนอเดียวกันกลับไปรอคิวถัดไป ไม่ใช่หลุดออกจากระบบ
      await tx.waitlistEntry.updateMany({
        where: {
          status: WaitlistStatus.OFFERED,
          offeredSlotAt: slotStart,
          offeredProviderId: providerId,
        },
        data: {
          status: WaitlistStatus.WAITING,
          offeredSlotAt: null,
          offerExpiresAt: null,
          offeredProviderId: null,
        },
      });

      const provider = await tx.provider.findUnique({
        where: { id: providerId },
        select: { name: true },
      });

      return {
        status: 'ok',
        appointmentId: appointment.id,
        slotStart,
        providerName: provider?.name ?? 'ทีมงานของร้าน',
        serviceName: entry.service.name,
      } as ClaimResult;
    });

    // การกดรับคิวว่างก็คือการกลับมาจอง — ลูกค้าที่เคยได้รับข้อความแคมเปญต้องถูกนับผลด้วย
    // ไม่ใช่นับเฉพาะคนที่พนักงานเป็นคนสร้างนัดให้ (Phase 6)
    if (result.status === 'ok') {
      await this.attribution.stampReturn(entry.customer.id, this.clock.now());
    }

    return result;
  }

  /**
   * ปิดข้อเสนอที่เลยเส้นตายแล้ว
   *
   * คิวที่ไม่มีใครรับต้องกลับไปอยู่ในมือพนักงาน ไม่ใช่หายไปเงียบ ๆ — ร้านจะได้โทรตามเอง
   */
  async expireOffers(): Promise<number> {
    const now = this.clock.now();
    const stale = await this.prisma.waitlistEntry.findMany({
      where: { status: WaitlistStatus.OFFERED, offerExpiresAt: { lte: now } },
      include: {
        customer: { select: { id: true, name: true, lineUserId: true, consentReminder: true } },
        service: { select: { id: true, name: true, durationMin: true } },
      },
    });

    if (stale.length === 0) return 0;

    await this.prisma.waitlistEntry.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: {
        status: WaitlistStatus.EXPIRED,
        offeredSlotAt: null,
        offerExpiresAt: null,
        offeredProviderId: null,
      },
    });

    const slots = [...new Set(stale.map((item) => item.offeredSlotAt?.getTime()).filter(Boolean))];
    for (const slot of slots) {
      await this.notifyAdmin(
        '⏰ ไม่มีใครกดรับคิวว่างที่เสนอไป\n' +
          `${formatThaiDate(new Date(slot as number))} เวลา ${formatBangkokTime(new Date(slot as number))} น.\n` +
          'รบกวนโทรหาลูกค้าในคิวรอโดยตรงครับ',
      );
    }

    return stale.length;
  }

  private async log(
    customerId: string,
    deliveryStatus: DeliveryStatus,
    errorMessage: string | null = null,
  ): Promise<void> {
    await this.prisma.messageLog.create({
      data: { customerId, type: MsgType.SLOT_OFFER, deliveryStatus, errorMessage },
    });
  }

  private async notifyAdmin(text: string): Promise<void> {
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');

    if (!adminUserId) {
      this.logger.warn(
        'ยังไม่ได้ตั้ง LINE_ADMIN_USER_ID — ไม่มีใครได้รับแจ้งเรื่องคิวว่างที่ไม่มีคนรับ',
      );
      return;
    }

    await this.line.pushText(adminUserId, text);
  }
}
