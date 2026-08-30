import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type PaginatedResponse } from '@clinicq/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { CampaignsService } from './campaigns.service';
import { WinbackService, type WinbackRunResult } from './winback.service';
import {
  CampaignResponseDto,
  CampaignResultsDto,
  CreateCampaignDto,
  FindCampaignsQueryDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

@ApiTags('แคมเปญดึงลูกค้ากลับ')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly winback: WinbackService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'รายการแคมเปญ' })
  findAll(@Query() query: FindCampaignsQueryDto): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.campaigns.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ข้อมูลแคมเปญรายการเดียว' })
  findOne(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaigns.findOne(id);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'ผลของแคมเปญ (ROI)',
    description: 'ส่งไปกี่คน กลับมาจองกี่คน คิดเป็นรายได้เท่าไหร่',
  })
  results(@Param('id') id: string): Promise<CampaignResultsDto> {
    return this.campaigns.results(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'สร้างแคมเปญ' })
  create(@Body() dto: CreateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaigns.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'แก้ไขแคมเปญ หรือเปิด/ปิดการทำงาน' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    return this.campaigns.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ปิดแคมเปญ' })
  deactivate(@Param('id') id: string): Promise<void> {
    return this.campaigns.deactivate(id);
  }

  @Post(':id/test')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'ส่งข้อความทดสอบเข้า LINE แอดมิน',
    description: 'ดูหน้าตาข้อความจริงก่อนส่งหาลูกค้า — ไม่แตะรายชื่อลูกค้าและไม่บันทึกผลแคมเปญ',
  })
  @ApiResponse({ status: 400, description: 'ยังไม่ได้ตั้งค่า LINE_ADMIN_USER_ID' })
  sendTest(@Param('id') id: string): Promise<{ sent: boolean }> {
    return this.campaigns.sendTest(id);
  }

  @Post(':id/run')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'ยิงแคมเปญเดี๋ยวนี้',
    description:
      'ปกติงานนี้ทำงานเองทุกวันตอน 10:00 — ปุ่มนี้ไว้ใช้ตอนเดโมหรือตอนอยากส่งรอบพิเศษ ' +
      'คนที่เคยได้รับข้อความของแคมเปญนี้แล้วจะไม่ถูกส่งซ้ำ',
  })
  run(@Param('id') id: string): Promise<WinbackRunResult> {
    return this.winback.runCampaign(id);
  }
}
