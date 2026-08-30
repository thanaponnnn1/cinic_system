import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type PaginatedResponse, WaitlistStatus } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  WaitlistEntryResponseDto,
  type CreateWaitlistEntryDto,
  type FindWaitlistQueryDto,
} from './dto/waitlist.dto';
import type { Prisma } from '../generated/prisma/client';

/** สถานะที่ยังอยู่ในความสนใจของพนักงาน — ที่เหลือถือเป็นประวัติ */
const OPEN_STATUSES = [WaitlistStatus.WAITING, WaitlistStatus.OFFERED];

const ENTRY_INCLUDE = {
  customer: { select: { id: true, name: true, lineUserId: true } },
  service: { select: { id: true, name: true } },
} satisfies Prisma.WaitlistEntryInclude;

/**
 * งานฝั่งพนักงานของคิวรอ — เพิ่มคน ดูรายการ ยกเลิก
 *
 * ส่วนที่เป็นเครื่องยนต์ (เสนอคิว แย่งคิว หมดเวลา) อยู่ที่ WaitlistEngineService
 * แยกกันเพราะฝั่งนี้ตอบคำขอจากหน้าจอ ส่วนฝั่งนั้นทำงานจากคิวงานเบื้องหลัง
 */
@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindWaitlistQueryDto): Promise<PaginatedResponse<WaitlistEntryResponseDto>> {
    const where: Prisma.WaitlistEntryWhereInput = {
      status: { in: query.status ? [query.status] : OPEN_STATUSES },
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        // เรียงตามลำดับการลงชื่อ เพราะพนักงานใช้ลำดับนี้ตอนโทรตามด้วยตัวเอง
        orderBy: { createdAt: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);

    return paginate(
      rows.map((row) => WaitlistEntryResponseDto.from(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async create(dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponseDto> {
    const windowStart = new Date(dto.windowStart);
    const windowEnd = new Date(dto.windowEnd);

    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
      throw new BadRequestException('ช่วงเวลาที่สะดวกไม่ถูกต้อง');
    }

    if (windowEnd.getTime() <= windowStart.getTime()) {
      throw new BadRequestException('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
    }

    const [customer, service] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { id: true } }),
      this.prisma.service.findUnique({ where: { id: dto.serviceId }, select: { id: true } }),
    ]);

    if (!customer) throw new NotFoundException('ไม่พบลูกค้ารายนี้');
    if (!service) throw new NotFoundException('ไม่พบบริการนี้');

    // ลงชื่อซ้ำช่วงเดิมทำให้ลูกค้าได้ข้อความคิวว่างสองใบพร้อมกัน ซึ่งดูเหมือนระบบพัง
    const duplicate = await this.prisma.waitlistEntry.findFirst({
      where: {
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        windowStart,
        windowEnd,
        status: { in: OPEN_STATUSES },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('ลูกค้ารายนี้อยู่ในคิวรอของช่วงเวลานี้อยู่แล้ว');
    }

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        windowStart,
        windowEnd,
      },
      include: ENTRY_INCLUDE,
    });

    return WaitlistEntryResponseDto.from(entry);
  }

  /** ถอนชื่อออกจากคิวรอ — ไม่ลบจริงเพราะต้องตอบได้ว่าเคยมีคนรอคิวช่วงนั้น */
  async cancel(id: string): Promise<void> {
    const entry = await this.prisma.waitlistEntry.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!entry) throw new NotFoundException('ไม่พบใบจองคิวรอนี้');

    if (entry.status === WaitlistStatus.CLAIMED) {
      throw new BadRequestException('ใบนี้ได้คิวไปแล้ว หากต้องการยกเลิกให้ยกเลิกที่ตัวนัดหมายแทน');
    }

    await this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: WaitlistStatus.CANCELLED },
    });
  }
}
