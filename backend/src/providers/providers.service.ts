import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import {
  ProviderResponseDto,
  type CreateProviderDto,
  type FindProvidersQueryDto,
  type UpdateProviderDto,
} from './dto/provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindProvidersQueryDto): Promise<PaginatedResponse<ProviderResponseDto>> {
    const where = query.includeInactive ? {} : { isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.provider.count({ where }),
    ]);

    return paginate(rows.map(ProviderResponseDto.from), total, query.page, query.limit);
  }

  async findOne(id: string): Promise<ProviderResponseDto> {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('ไม่พบผู้ให้บริการรายนี้');
    return ProviderResponseDto.from(provider);
  }

  async create(dto: CreateProviderDto): Promise<ProviderResponseDto> {
    const provider = await this.prisma.provider.create({ data: dto });
    return ProviderResponseDto.from(provider);
  }

  async update(id: string, dto: UpdateProviderDto): Promise<ProviderResponseDto> {
    await this.ensureExists(id);
    const provider = await this.prisma.provider.update({ where: { id }, data: dto });
    return ProviderResponseDto.from(provider);
  }

  /** ปิดการใช้งาน — ประวัตินัดที่ผ่านมายังต้องอ้างถึงช่างคนนี้ได้ จึงไม่ลบจริง */
  async deactivate(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.provider.update({ where: { id }, data: { isActive: false } });
  }

  private async ensureExists(id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('ไม่พบผู้ให้บริการรายนี้');
    return provider;
  }
}
