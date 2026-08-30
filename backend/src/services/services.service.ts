import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  ServiceResponseDto,
  type CreateServiceDto,
  type FindServicesQueryDto,
  type UpdateServiceDto,
} from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindServicesQueryDto): Promise<PaginatedResponse<ServiceResponseDto>> {
    const where = query.includeInactive ? {} : { isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return paginate(rows.map(ServiceResponseDto.from), total, query.page, query.limit);
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('ไม่พบบริการนี้');
    return ServiceResponseDto.from(service);
  }

  async create(dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.prisma.service.create({ data: dto });
    return ServiceResponseDto.from(service);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    await this.ensureExists(id);
    const service = await this.prisma.service.update({ where: { id }, data: dto });
    return ServiceResponseDto.from(service);
  }

  /** ปิดการใช้งาน — นัดที่ผ่านมายังต้องอ้างถึงบริการนี้ได้ จึงไม่ลบจริง */
  async deactivate(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('ไม่พบบริการนี้');
    return service;
  }
}
