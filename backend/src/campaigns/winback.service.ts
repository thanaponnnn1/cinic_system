import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, MsgType } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { ClockService } from '../clock/clock.service';
import { sleep } from '../common/sleep';
import { NAME_PLACEHOLDER } from './dto/campaign.dto';

/**
 * เว้นจังหวะระหว่างข้อความ 1 วินาที
 *
 * LINE จำกัดอัตราการเรียก API ต่อวินาที การยิงรวดเดียวหลายสิบฉบับจะโดนปฏิเสธเป็นชุด
 * แล้วลูกค้าท้าย ๆ รายชื่อจะไม่ได้รับอะไรเลยโดยที่ระบบไม่ได้พัง — ความล้มเหลวชนิดที่มองไม่เห็น
 */
export const WINBACK_THROTTLE_MS = 1_000;

/** ผลของการยิงแคมเปญหนึ่งรอบ */
export interface WinbackRunResult {
  campaignId: string;
  name: string;
  /** จำนวนคนที่เข้าเกณฑ์และยังไม่เคยได้รับข้อความของแคมเปญนี้ */
  targeted: number;
  sent: number;
  failed: number;
}

/** ข้อมูลลูกค้าเท่าที่แคมเปญต้องใช้ */
interface Target {
  id: string;
  name: string;
  lineUserId: string | null;
}

/**
 * แคมเปญดึงลูกค้าที่หายไปกลับมา
 *
 * รูที่สามของ use-cases.md — ลูกค้าเก่าที่หายไปเงียบ ๆ ร้านส่วนใหญ่ไม่มีใครไล่ตามเพราะ
 * ไม่มีเวลา งานนี้จึงทำแทนทุกวันตอนสิบโมง แล้วบันทึกไว้ว่าส่งหาใครไปบ้าง
 *
 * กฎที่ยึด:
 * 1. ส่งหาเฉพาะคนที่ยินยอมรับข้อความการตลาดและผูก LINE แล้ว — คัดตั้งแต่ในคำสั่งค้นหา
 *    จึงไม่มีทางที่ข้อความจะออกไปหาคนที่ไม่ยินยอมแม้โค้ดข้างล่างจะผิดพลาด
 * 2. คนหนึ่งคนได้รับข้อความของแคมเปญหนึ่งแคมเปญได้ครั้งเดียวตลอดกาล — บังคับด้วย
 *    unique [campaignId, customerId] ในฐานข้อมูล ไม่ใช่ด้วยความระวังของโค้ด
 * 3. หน่วงจังหวะการส่ง กัน rate limit ของ LINE
 */
@Injectable()
export class WinbackService {
  private readonly logger = new Logger(WinbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly clock: ClockService,
  ) {}

  /** งานรายวัน — ยิงทุกแคมเปญที่เปิดอยู่ */
  async runActiveCampaigns(): Promise<WinbackRunResult[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (campaigns.length === 0) {
      this.logger.log('ไม่มีแคมเปญที่เปิดอยู่ — ไม่ต้องส่งอะไรวันนี้');
      return [];
    }

    const results: WinbackRunResult[] = [];

    for (const campaign of campaigns) {
      results.push(await this.runCampaign(campaign.id));
    }

    return results;
  }

  /** ยิงแคมเปญเดียว — ใช้ทั้งจากงานรายวันและจากปุ่มบน dashboard */
  async runCampaign(campaignId: string): Promise<WinbackRunResult> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('ไม่พบแคมเปญนี้');

    const targets = await this.findTargets(campaignId, campaign.inactiveDays);
    const result: WinbackRunResult = {
      campaignId: campaign.id,
      name: campaign.name,
      targeted: targets.length,
      sent: 0,
      failed: 0,
    };

    for (const [index, target] of targets.entries()) {
      // หน่วงก่อนฉบับที่สองเป็นต้นไป ฉบับแรกออกทันทีเพื่อให้เดโมเห็นผลเร็ว
      if (index > 0) await sleep(WINBACK_THROTTLE_MS);

      const sent = await this.sendTo(campaign.id, campaign.message, target);
      if (sent) result.sent += 1;
      else result.failed += 1;
    }

    this.logger.log(
      `แคมเปญ "${campaign.name}" — เข้าเกณฑ์ ${result.targeted} คน ส่งสำเร็จ ${result.sent} คน`,
    );

    return result;
  }

  /**
   * รายชื่อที่เข้าเกณฑ์ของแคมเปญนี้
   *
   * คนที่ยังไม่เคยมาเลยก็นับว่าหายไปด้วย แต่ต้องเป็นโปรไฟล์ที่สร้างไว้นานพอ ๆ กัน
   * ไม่งั้นลูกค้าที่พนักงานเพิ่งกรอกเข้าระบบเมื่อวานจะได้ข้อความ "ไม่ได้เจอกันนานเลย"
   */
  private async findTargets(campaignId: string, inactiveDays: number): Promise<Target[]> {
    const cutoff = new Date(this.clock.now().getTime() - inactiveDays * 86_400_000);

    return this.prisma.customer.findMany({
      where: {
        isActive: true,
        consentMarketing: true,
        lineUserId: { not: null },
        OR: [
          { lastVisitAt: { lt: cutoff } },
          { AND: [{ lastVisitAt: null }, { createdAt: { lt: cutoff } }] },
        ],
        // ไม่เคยถูกส่งในแคมเปญนี้มาก่อน
        campaignRuns: { none: { campaignId } },
      },
      select: { id: true, name: true, lineUserId: true },
      orderBy: { lastVisitAt: { sort: 'asc', nulls: 'first' } },
    });
  }

  /**
   * ส่งหาคนเดียว แล้วบันทึกหลักฐานไว้ทั้งสองที่
   *
   * จองสิทธิ์ใน CampaignRun ก่อนส่งเสมอ เพราะถ้างานถูกรันซ้ำระหว่างที่ LINE ตอบช้า
   * ลูกค้าจะได้ข้อความการตลาดสองฉบับ ซึ่งเป็นความผิดพลาดที่มองเห็นจากฝั่งลูกค้าทันที
   * และเมื่อส่งไม่สำเร็จจึงถอนสิทธิ์คืน เพื่อให้งานของวันพรุ่งนี้ลองใหม่ได้
   */
  private async sendTo(campaignId: string, message: string, target: Target): Promise<boolean> {
    let runId: string;

    try {
      const run = await this.prisma.campaignRun.create({
        data: { campaignId, customerId: target.id, sentAt: this.clock.now() },
        select: { id: true },
      });
      runId = run.id;
    } catch {
      // ชน unique [campaignId, customerId] = มีอีกโปรเซสส่งไปแล้ว ไม่ใช่ความผิดพลาด
      this.logger.warn(`ข้ามลูกค้า ${target.id} เพราะมีการส่งของแคมเปญนี้อยู่แล้ว`);
      return false;
    }

    const sent = target.lineUserId
      ? await this.line.pushText(target.lineUserId, personalize(message, target.name))
      : false;

    if (!sent) {
      // ถอนสิทธิ์คืนให้งานรอบหน้าลองใหม่ — ไม่งั้นคนที่ส่งพลาดหนึ่งครั้งจะไม่มีวันได้รับเลย
      await this.prisma.campaignRun.delete({ where: { id: runId } }).catch(() => undefined);
    }

    await this.prisma.messageLog.create({
      data: {
        customerId: target.id,
        type: MsgType.WINBACK,
        deliveryStatus: sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        errorMessage: sent ? null : 'ส่งข้อความแคมเปญผ่าน LINE ไม่สำเร็จ',
        sentAt: this.clock.now(),
      },
    });

    return sent;
  }
}

/** แทน {name} ด้วยชื่อลูกค้า — ข้อความที่ไม่มีตัวแทนก็ส่งได้ตามเดิม */
export function personalize(message: string, customerName: string): string {
  return message.split(NAME_PLACEHOLDER).join(customerName);
}
