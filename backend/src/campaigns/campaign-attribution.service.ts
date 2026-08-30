import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ยอมนับว่า "กลับมาเพราะแคมเปญ" ภายในกี่วันหลังส่งข้อความ
 *
 * ต้องมีเพดาน ไม่งั้นลูกค้าที่กลับมาเองในอีกหนึ่งปีจะถูกนับเป็นผลงานของแคมเปญ
 * แล้วตัวเลข ROI ที่เอาไปเสนอลูกค้าจะกลายเป็นตัวเลขที่ป้องกันไม่ได้ตอนถูกถาม
 */
export const ATTRIBUTION_WINDOW_DAYS = 60;

/**
 * ตัวเชื่อม "ส่งข้อความไป" กับ "ได้เงินกลับมา"
 *
 * แยกเป็นบริการเล็ก ๆ ที่พึ่งแค่ฐานข้อมูล เพื่อให้โมดูลนัดหมายเรียกใช้ได้โดยไม่ต้องลาก
 * ระบบส่งข้อความของแคมเปญเข้ามาด้วย — หลักการเดียวกับ WaitlistQueueService ใน Phase 5
 *
 * ทุกเมธอดกลืน error ไว้เอง เพราะการจองและการปิดงานสำคัญกว่าตัวเลขในรายงาน
 * ถ้าเขียนสถิติไม่สำเร็จแล้วทำให้ลูกค้าจองคิวไม่ได้ คือแลกของแพงด้วยของถูก
 */
@Injectable()
export class CampaignAttributionService {
  private readonly logger = new Logger(CampaignAttributionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ลูกค้าที่เคยได้รับข้อความกลับมาจองอีกครั้ง
   *
   * เขียนทุกรอบที่ยังไม่ถูกประทับ ไม่ใช่แค่รอบล่าสุด เพราะลูกค้าคนหนึ่งอาจอยู่ในหลายแคมเปญ
   * และแต่ละแคมเปญมีสิทธิ์นับผลของตัวเอง
   */
  async stampReturn(customerId: string, bookedAt: Date): Promise<number> {
    const earliestSent = new Date(bookedAt.getTime() - ATTRIBUTION_WINDOW_DAYS * 86_400_000);

    try {
      const { count } = await this.prisma.campaignRun.updateMany({
        where: {
          customerId,
          returnedAt: null,
          // ต้องเป็นการจองที่เกิด "หลัง" ได้รับข้อความ และยังอยู่ในเพดานเวลาที่ยอมนับ
          sentAt: { lte: bookedAt, gte: earliestSent },
        },
        data: { returnedAt: bookedAt },
      });

      return count;
    } catch (error) {
      this.logger.error(`ประทับการกลับมาของลูกค้า ${customerId} ไม่สำเร็จ: ${describe(error)}`);
      return 0;
    }
  }

  /**
   * ประทับรายได้จากการมาครั้งแรกหลังกลับมา
   *
   * นับเฉพาะครั้งแรก (revenue ยังว่าง) เพราะสิ่งที่แคมเปญพาให้เกิดคือ "การกลับมาครั้งนั้น"
   * ส่วนครั้งต่อ ๆ ไปเป็นผลของบริการที่ร้านทำเอง ไม่ใช่ของข้อความที่ส่งไป
   */
  async stampRevenue(customerId: string, amount: number): Promise<boolean> {
    try {
      const run = await this.prisma.campaignRun.findFirst({
        where: { customerId, returnedAt: { not: null }, revenue: null },
        orderBy: { sentAt: 'desc' },
        select: { id: true },
      });

      if (!run) return false;

      await this.prisma.campaignRun.update({ where: { id: run.id }, data: { revenue: amount } });
      this.logger.log(`ประทับรายได้ ${amount} บาทให้แคมเปญของลูกค้า ${customerId}`);

      return true;
    } catch (error) {
      this.logger.error(`ประทับรายได้ของลูกค้า ${customerId} ไม่สำเร็จ: ${describe(error)}`);
      return false;
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
