import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse, Role } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import type {
  CreateCustomerDto,
  FindCustomersQueryDto,
  UpdateConsentDto,
  UpdateCustomerDto,
} from './dto/customer-request.dto';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: FindCustomersQueryDto,
    viewerRole: Role,
  ): Promise<PaginatedResponse<CustomerResponseDto>> {
    const where: Prisma.CustomerWhereInput = {};

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term.replace(/[\s-]/g, '') } },
      ];
    }

    if (query.inactiveDays !== undefined) {
      const cutoff = new Date(Date.now() - query.inactiveDays * 86_400_000);
      // ลูกค้าที่ยังไม่เคยมาเลย (lastVisitAt = null) ก็นับว่าหายไปด้วย
      // ไม่งั้นคนที่สร้างโปรไฟล์ไว้แล้วไม่เคยมาจะหลุดจากแคมเปญตามกลับทั้งหมด
      where.OR = [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastVisitAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginate(
      rows.map((row) => CustomerResponseDto.from(row, viewerRole)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string, viewerRole: Role): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('ไม่พบลูกค้ารายนี้');

    return CustomerResponseDto.from(customer, viewerRole);
  }

  async create(dto: CreateCustomerDto, viewerRole: Role): Promise<CustomerResponseDto> {
    const existing = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException(`เบอร์ ${dto.phone} มีอยู่ในระบบแล้ว (${existing.name})`);
    }

    const givesConsent = dto.consentReminder === true || dto.consentMarketing === true;

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        note: dto.note,
        consentReminder: dto.consentReminder ?? false,
        consentMarketing: dto.consentMarketing ?? false,
        // บันทึกเวลาที่ให้ความยินยอมทันทีที่มีการให้ — ไม่มีความยินยอมก็ไม่มี timestamp
        consentAt: givesConsent ? new Date() : null,
      },
    });

    return CustomerResponseDto.from(customer, viewerRole);
  }

  async update(id: string, dto: UpdateCustomerDto, viewerRole: Role): Promise<CustomerResponseDto> {
    await this.ensureExists(id);

    if (dto.phone) {
      const clash = await this.prisma.customer.findUnique({ where: { phone: dto.phone } });
      if (clash && clash.id !== id) {
        throw new ConflictException(`เบอร์ ${dto.phone} ถูกใช้โดยลูกค้ารายอื่นแล้ว`);
      }
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: { name: dto.name, phone: dto.phone, note: dto.note },
    });

    return CustomerResponseDto.from(customer, viewerRole);
  }

  /**
   * แก้ไขความยินยอม
   *
   * ทุกครั้งที่ค่าความยินยอมเปลี่ยน ต้องทับ `consentAt` ด้วยเวลาปัจจุบันเสมอ
   * เพราะสิ่งที่ต้องพิสูจน์ได้ตาม PDPA คือ "ยินยอมเมื่อไหร่" ไม่ใช่แค่ "ยินยอมหรือไม่"
   */
  async updateConsent(
    id: string,
    dto: UpdateConsentDto,
    viewerRole: Role,
  ): Promise<CustomerResponseDto> {
    const current = await this.ensureExists(id);

    const next = {
      consentReminder: dto.consentReminder ?? current.consentReminder,
      consentMarketing: dto.consentMarketing ?? current.consentMarketing,
    };

    const changed =
      next.consentReminder !== current.consentReminder ||
      next.consentMarketing !== current.consentMarketing;

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...next,
        ...(changed ? { consentAt: new Date() } : {}),
      },
    });

    return CustomerResponseDto.from(customer, viewerRole);
  }

  /** ปิดการใช้งาน — ไม่ลบจริง เพราะประวัตินัดและใบเสร็จยังต้องอ้างถึงลูกค้ารายนี้ได้ */
  async deactivate(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }

  async reactivate(id: string, viewerRole: Role): Promise<CustomerResponseDto> {
    await this.ensureExists(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { isActive: true },
    });
    return CustomerResponseDto.from(customer, viewerRole);
  }

  private async ensureExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('ไม่พบลูกค้ารายนี้');
    return customer;
  }
}
