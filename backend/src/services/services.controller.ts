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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type PaginatedResponse } from '@clinicq/shared';
import { ServicesService } from './services.service';
import {
  CreateServiceDto,
  FindServicesQueryDto,
  ServiceResponseDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('บริการ')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'รายการบริการ' })
  findAll(@Query() query: FindServicesQueryDto): Promise<PaginatedResponse<ServiceResponseDto>> {
    return this.services.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ข้อมูลบริการรายการเดียว' })
  findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.services.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'เพิ่มบริการ' })
  create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return this.services.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'แก้ไขบริการ' })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return this.services.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ปิดการใช้งานบริการ' })
  deactivate(@Param('id') id: string): Promise<void> {
    return this.services.deactivate(id);
  }
}
