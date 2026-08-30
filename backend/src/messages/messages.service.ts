import { Injectable } from '@nestjs/common';
import { DeliveryStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  MessageLogResponseDto,
  type FindMessagesQueryDto,
  type MessageFeed,
  type MessageStatsDto,
} from './dto/message.dto';
import type { Prisma } from '../generated/prisma/client';

/**
 * หน้าตรวจสอบการส่งข้อความ (PDPA)
 *
 * คุณค่าของหน้านี้อยู่ที่แถว SKIPPED_* ไม่ใช่แถว SENT — มันคือหลักฐานที่เปิดให้เจ้าของคลินิก
 * ดูได้ตรง ๆ ว่าระบบไม่ได้ส่งข้อความหาคนที่ไม่ได้ให้ความยินยอม ซึ่งเป็นสิ่งที่ต้องพิสูจน์ได้
 */
@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindMessagesQueryDto): Promise<MessageFeed> {
    const where: Prisma.MessageLogWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.deliveryStatus ? { deliveryStatus: query.deliveryStatus } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };

    const [rows, total, stats] = await Promise.all([
      this.prisma.messageLog.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          appointment: { select: { startsAt: true } },
        },
        orderBy: { sentAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.messageLog.count({ where }),
      // ยอดรวมนับจากทั้งระบบเสมอ ไม่ผูกกับตัวกรองที่เลือกอยู่ เพราะมันคือภาพรวมที่เอาไว้โชว์
      this.prisma.messageLog.groupBy({ by: ['deliveryStatus'], _count: true }),
    ]);

    return {
      ...paginate(rows.map(MessageLogResponseDto.from), total, query.page, query.limit),
      stats: toStats(stats),
    };
  }
}

function toStats(rows: { deliveryStatus: string; _count: number }[]): MessageStatsDto {
  const count = (status: DeliveryStatus): number =>
    rows.find((row) => row.deliveryStatus === status)?._count ?? 0;

  return {
    sent: count(DeliveryStatus.SENT),
    failed: count(DeliveryStatus.FAILED),
    skippedNoConsent: count(DeliveryStatus.SKIPPED_NO_CONSENT),
    skippedNoLine: count(DeliveryStatus.SKIPPED_NO_LINE),
    skippedDuplicate: count(DeliveryStatus.SKIPPED_DUPLICATE),
  };
}
