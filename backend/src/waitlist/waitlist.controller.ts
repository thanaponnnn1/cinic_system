import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type PaginatedResponse } from '@clinicq/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { WaitlistService } from './waitlist.service';
import {
  CreateWaitlistEntryDto,
  FindWaitlistQueryDto,
  WaitlistEntryResponseDto,
} from './dto/waitlist.dto';

@ApiTags('คิวรอ')
@ApiBearerAuth()
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get()
  @ApiOperation({
    summary: 'รายชื่อคิวรอ',
    description: 'ไม่ระบุสถานะ = เห็นเฉพาะคนที่ยังรอคิวและคนที่กำลังถูกเสนอคิวอยู่',
  })
  findAll(
    @Query() query: FindWaitlistQueryDto,
  ): Promise<PaginatedResponse<WaitlistEntryResponseDto>> {
    return this.waitlist.findAll(query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'เพิ่มลูกค้าเข้าคิวรอ',
    description:
      'ใช้ตอนลูกค้าจองไม่ได้เพราะคิวเต็ม — เมื่อมีนัดถูกยกเลิก ระบบจะส่งคิวว่างให้ทุกคนที่ช่วงเวลาตรงกันทันที',
  })
  @ApiResponse({ status: 409, description: 'ลูกค้ารายนี้อยู่ในคิวรอของช่วงเวลานี้อยู่แล้ว' })
  create(@Body() dto: CreateWaitlistEntryDto): Promise<WaitlistEntryResponseDto> {
    return this.waitlist.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ถอนชื่อออกจากคิวรอ' })
  @ApiResponse({ status: 400, description: 'ใบนี้ได้คิวไปแล้ว ต้องไปยกเลิกที่ตัวนัดหมายแทน' })
  cancel(@Param('id') id: string): Promise<void> {
    return this.waitlist.cancel(id);
  }
}
