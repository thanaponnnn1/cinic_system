import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaginatedResponse } from '@clinicq/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { paginate } from '../common/dto/pagination.dto';
import { personalize } from './winback.service';
import {
  CampaignResponseDto,
  type CampaignResultsDto,
  type CreateCampaignDto,
  type FindCampaignsQueryDto,
  type UpdateCampaignDto,
} from './dto/campaign.dto';

/**
 * งานฝั่งหน้าจอของแคมเปญ — ตั้งค่า ดูผล และส่งทดสอบ
 *
 * ส่วนที่ยิงข้อความจริงตามรอบเวลาอยู่ที่ WinbackService แยกกันด้วยเหตุผลเดียวกับคิวรอ:
 * ฝั่งนี้ตอบคำขอจากหน้าจอ ฝั่งนั้นทำงานจากคิวงานเบื้องหลัง
 */
@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly line: LineMessagingService,
    private readonly config: ConfigService,
  ) {}

  async findAll(query: FindCampaignsQueryDto): Promise<PaginatedResponse<CampaignResponseDto>> {
    const where = query.includeInactive ? {} : { isActive: true };

    const [rows, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return paginate(rows.map(CampaignResponseDto.from), total, query.page, query.limit);
  }

  async findOne(id: string): Promise<CampaignResponseDto> {
    return CampaignResponseDto.from(await this.ensureExists(id));
  }

  async create(dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        message: dto.message,
        inactiveDays: dto.inactiveDays ?? 90,
      },
    });

    return CampaignResponseDto.from(campaign);
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    await this.ensureExists(id);

    const campaign = await this.prisma.campaign.update({ where: { id }, data: dto });

    return CampaignResponseDto.from(campaign);
  }

  /** ปิดแคมเปญ — งานรายวันจะข้ามไป แต่ผลที่เคยส่งไปแล้วยังอยู่ให้ดูย้อนหลังได้ */
  async deactivate(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.campaign.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * ผลของแคมเปญ — ส่งกี่คน กลับมากี่คน ได้เงินเท่าไหร่
   *
   * คำถามที่ลูกค้าถามจริงคือ "จ้างคุณแล้วได้เงินคืนเมื่อไหร่" ตัวเลขชุดนี้ตอบตรง ๆ
   */
  async results(id: string): Promise<CampaignResultsDto> {
    const campaign = await this.ensureExists(id);

    const [sent, returned, revenue] = await Promise.all([
      this.prisma.campaignRun.count({ where: { campaignId: id } }),
      this.prisma.campaignRun.count({ where: { campaignId: id, returnedAt: { not: null } } }),
      this.prisma.campaignRun.aggregate({
        where: { campaignId: id },
        _sum: { revenue: true },
      }),
    ]);

    return {
      campaignId: campaign.id,
      name: campaign.name,
      sent,
      returned,
      // ส่งไป 0 คนแล้วหารด้วยศูนย์จะได้ NaN ซึ่งกลายเป็น null ตอนแปลงเป็น JSON
      returnRate: sent === 0 ? 0 : Math.round((returned / sent) * 1000) / 10,
      revenue: Number(revenue._sum.revenue ?? 0),
    };
  }

  /**
   * ส่งข้อความของแคมเปญเข้า LINE ของแอดมิน
   *
   * มีไว้ให้เจ้าของร้านเห็นหน้าตาข้อความจริงก่อนกดใช้จริง — ข้อความการตลาดที่พิมพ์ผิด
   * แล้วออกไปหาลูกค้าสองร้อยคนพร้อมกันคือสิ่งที่ถอนคืนไม่ได้
   */
  async sendTest(id: string): Promise<{ sent: boolean }> {
    const campaign = await this.ensureExists(id);
    const adminUserId = this.config.get<string>('LINE_ADMIN_USER_ID');

    if (!adminUserId) {
      throw new BadRequestException(
        'ยังไม่ได้ตั้งค่า LINE_ADMIN_USER_ID จึงไม่รู้ว่าจะส่งข้อความทดสอบไปหาใคร',
      );
    }

    const text = `🧪 ทดสอบแคมเปญ "${campaign.name}"\n\n${personalize(campaign.message, 'คุณลูกค้า')}`;
    const sent = await this.line.pushText(adminUserId, text);

    if (!sent) this.logger.warn(`ส่งข้อความทดสอบของแคมเปญ ${id} ไม่สำเร็จ`);

    return { sent };
  }

  private async ensureExists(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('ไม่พบแคมเปญนี้');
    return campaign;
  }
}
