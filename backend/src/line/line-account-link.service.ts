import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueViolation } from '../common/prisma-errors';

/**
 * ผลของการผูกบัญชี LINE ด้วยรหัส 6 หลัก
 *
 * คืนเป็นค่าแทนการโยน error เพราะมีผู้เรียกสองทางที่ต้องพูดคนละภาษา — แชทตอบเป็นข้อความสุภาพ
 * ส่วนหน้าเว็บลูกค้า (LIFF) ตอบเป็นรหัส HTTP — แต่ละทางแปลผลเองโดยกฎการผูกอยู่ที่เดียว
 */
export type LinkAccountResult =
  | { status: 'linked'; customer: { id: string; name: string } }
  /** ไม่มีรหัสนี้ หรือถูกใช้ไปแล้ว (รหัสใช้ได้ครั้งเดียว) */
  | { status: 'code_not_found' }
  /** บัญชี LINE นี้ผูกกับลูกค้าอีกคนอยู่ก่อนแล้ว */
  | { status: 'line_already_linked_to_other' };

/**
 * ผูกบัญชี LINE เข้ากับลูกค้าที่ถือรหัสเชื่อม — ใช้ร่วมกันทั้งแชทและหน้าเว็บลูกค้า
 *
 * แยกออกมาจาก LineWebhookService เพราะถ้าเขียนสองที่ วันหนึ่งกฎ "ใช้ได้ครั้งเดียว"
 * หรือ "ห้ามผูกทับคนอื่น" จะหลุดไปจากทางใดทางหนึ่งโดยไม่มีอะไรฟ้อง
 */
@Injectable()
export class LineAccountLinkService {
  private readonly logger = new Logger(LineAccountLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** รหัสใช้ได้ครั้งเดียวจริง ๆ เพราะล้างทิ้งพร้อมกับการผูกในคำสั่งเดียว */
  async link(code: string, lineUserId: string): Promise<LinkAccountResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { linkCode: code, isActive: true },
      select: { id: true, name: true },
    });

    if (!customer) return { status: 'code_not_found' };

    // lineUserId เป็น unique ในฐานข้อมูล ถ้าไม่เช็กก่อนจะได้ error ดิบ ๆ แทนคำตอบที่ลูกค้าอ่านรู้เรื่อง
    const owner = await this.prisma.customer.findUnique({
      where: { lineUserId },
      select: { id: true },
    });

    if (owner && owner.id !== customer.id) {
      this.logger.warn(
        `บัญชี LINE ผูกกับลูกค้า ${owner.id} อยู่แล้ว จึงไม่ผูกซ้ำให้ ${customer.id}`,
      );
      return { status: 'line_already_linked_to_other' };
    }

    try {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { lineUserId, linkCode: null },
      });
    } catch (error) {
      // สองคำขอจากบัญชี LINE เดียวกันมาพร้อมกันคนละรหัส ทั้งคู่ผ่านการเช็กข้างบน
      // แล้วคนที่สองไปชน unique ตอนเขียน — ผลจริงคือบัญชีนี้ถูกผูกกับอีกคนไปแล้ว
      if (isUniqueViolation(error)) return { status: 'line_already_linked_to_other' };
      throw error;
    }

    return { status: 'linked', customer };
  }
}
