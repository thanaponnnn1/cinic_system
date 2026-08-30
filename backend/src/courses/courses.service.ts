import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse, Role } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  CoursePackageResponseDto,
  CustomerCourseResponseDto,
  type CreateCoursePackageDto,
  type ExpiringCoursesQueryDto,
  type FindCoursePackagesQueryDto,
  type FindCustomerCoursesQueryDto,
  type PurchaseCourseDto,
  type UpdateCoursePackageDto,
} from './dto/course.dto';
import type { Prisma } from '../generated/prisma/client';

/** include ชุดเดียวที่ทุก query ของคอร์สที่ลูกค้าซื้อใช้ — DTO ต้องการครบทุกฟิลด์นี้ */
const COURSE_INCLUDE = {
  customer: { select: { name: true, phone: true } },
  package: { select: { name: true, totalSessions: true } },
} satisfies Prisma.CustomerCourseInclude;

/**
 * คอร์สแบบนับครั้ง — รูที่สี่ของ use-cases.md
 *
 * คอร์สที่ขายแล้วหมดอายุโดยไม่ได้ใช้คือเงินที่ร้านรับมาแล้วแต่กลายเป็นปัญหา (ขอคืนเงิน รีวิวแย่)
 * ระบบนี้จึงต้องตอบสองคำถามได้ตลอดเวลา: ลูกค้าคนนี้เหลือกี่ครั้ง และใครกำลังจะหมดอายุ
 *
 * การตัดครั้งไม่ได้อยู่ที่นี่ แต่อยู่ในธุรกรรมปิดงานของ AppointmentsService โดยตั้งใจ —
 * ครั้งของคอร์สต้องถูกตัดพร้อมกับการปิดนัด ไม่ใช่แยกกันคนละคำสั่งที่พลาดได้ทีละครึ่ง
 */
@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  // ── แม่แบบคอร์ส ─────────────────────────────────────────

  async findPackages(
    query: FindCoursePackagesQueryDto,
  ): Promise<PaginatedResponse<CoursePackageResponseDto>> {
    const where = query.includeInactive ? {} : { isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma.coursePackage.findMany({
        where,
        include: { service: { select: { name: true } } },
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.coursePackage.count({ where }),
    ]);

    return paginate(rows.map(CoursePackageResponseDto.from), total, query.page, query.limit);
  }

  async findPackage(id: string): Promise<CoursePackageResponseDto> {
    const pkg = await this.prisma.coursePackage.findUnique({
      where: { id },
      include: { service: { select: { name: true } } },
    });

    if (!pkg) throw new NotFoundException('ไม่พบคอร์สนี้');

    return CoursePackageResponseDto.from(pkg);
  }

  async createPackage(dto: CreateCoursePackageDto): Promise<CoursePackageResponseDto> {
    await this.assertServiceExists(dto.serviceId);

    const pkg = await this.prisma.coursePackage.create({
      data: dto,
      include: { service: { select: { name: true } } },
    });

    return CoursePackageResponseDto.from(pkg);
  }

  async updatePackage(id: string, dto: UpdateCoursePackageDto): Promise<CoursePackageResponseDto> {
    await this.findPackage(id);
    await this.assertServiceExists(dto.serviceId);

    const pkg = await this.prisma.coursePackage.update({
      where: { id },
      data: dto,
      include: { service: { select: { name: true } } },
    });

    return CoursePackageResponseDto.from(pkg);
  }

  /** เลิกขาย — คอร์สที่ลูกค้าซื้อไปแล้วยังใช้ได้ตามปกติจนหมดอายุ */
  async deactivatePackage(id: string): Promise<void> {
    await this.findPackage(id);
    await this.prisma.coursePackage.update({ where: { id }, data: { isActive: false } });
  }

  // ── คอร์สที่ลูกค้าซื้อ ──────────────────────────────────

  /**
   * บันทึกการซื้อคอร์ส
   *
   * วันหมดอายุคำนวณจากวันที่ซื้อ + อายุคอร์สของแม่แบบ ณ วันนั้น แล้วเก็บเป็นค่าตายตัว
   * ไม่ใช่คำนวณสดตอนอ่าน เพราะร้านแก้ validDays ของแม่แบบได้ทีหลัง และการแก้นั้น
   * ต้องไม่ย้อนไปเปลี่ยนอายุคอร์สของคนที่ซื้อไปแล้ว
   */
  async purchase(dto: PurchaseCourseDto, viewerRole: Role): Promise<CustomerCourseResponseDto> {
    const purchasedAt = dto.purchasedAt ? new Date(dto.purchasedAt) : this.clock.now();

    if (Number.isNaN(purchasedAt.getTime())) {
      throw new BadRequestException('วันที่ซื้อไม่ถูกต้อง');
    }

    const [customer, pkg] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { id: true, name: true, isActive: true },
      }),
      this.prisma.coursePackage.findUnique({ where: { id: dto.packageId } }),
    ]);

    if (!customer) throw new NotFoundException('ไม่พบลูกค้ารายนี้');
    if (!pkg) throw new NotFoundException('ไม่พบคอร์สนี้');
    if (!customer.isActive) throw new BadRequestException(`${customer.name} ถูกปิดการใช้งานอยู่`);
    if (!pkg.isActive) throw new BadRequestException(`คอร์ส "${pkg.name}" เลิกขายแล้ว`);

    const course = await this.prisma.customerCourse.create({
      data: {
        customerId: dto.customerId,
        packageId: dto.packageId,
        purchasedAt,
        expiresAt: new Date(purchasedAt.getTime() + pkg.validDays * 86_400_000),
      },
      include: COURSE_INCLUDE,
    });

    return CustomerCourseResponseDto.from(course, viewerRole, this.clock.now());
  }

  async findPurchases(
    query: FindCustomerCoursesQueryDto,
    viewerRole: Role,
  ): Promise<PaginatedResponse<CustomerCourseResponseDto>> {
    const now = this.clock.now();
    const where: Prisma.CustomerCourseWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.includeExpired ? {} : { expiresAt: { gt: now } }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.customerCourse.findMany({
        where,
        include: COURSE_INCLUDE,
        orderBy: { expiresAt: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customerCourse.count({ where }),
    ]);

    return paginate(
      rows.map((row) => CustomerCourseResponseDto.from(row, viewerRole, now)),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * คอร์สที่กำลังจะหมดอายุและยังมีครั้งเหลือ = รายชื่อที่ร้านควรโทรตาม
   *
   * คัดคอร์สที่ใช้ครบแล้วออกด้วยโค้ด ไม่ใช่ด้วยคำสั่งค้นหา เพราะจำนวนครั้งทั้งหมด
   * อยู่คนละตารางกับจำนวนครั้งที่ใช้ไป — ลิสต์นี้ไม่แบ่งหน้าจึงคัดทีหลังได้ตรงไปตรงมา
   */
  async findExpiring(
    query: ExpiringCoursesQueryDto,
    viewerRole: Role,
  ): Promise<CustomerCourseResponseDto[]> {
    const now = this.clock.now();
    const until = new Date(now.getTime() + (query.days ?? 30) * 86_400_000);

    const rows = await this.prisma.customerCourse.findMany({
      where: { expiresAt: { gt: now, lte: until }, customer: { isActive: true } },
      include: COURSE_INCLUDE,
      orderBy: { expiresAt: 'asc' },
    });

    return rows
      .filter((row) => row.usedSessions < row.package.totalSessions)
      .map((row) => CustomerCourseResponseDto.from(row, viewerRole, now));
  }

  private async assertServiceExists(serviceId?: string): Promise<void> {
    if (!serviceId) return;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!service) throw new NotFoundException('ไม่พบบริการที่จะผูกกับคอร์สนี้');
  }
}
