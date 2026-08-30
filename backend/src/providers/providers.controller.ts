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
import { ProvidersService } from './providers.service';
import {
  CreateProviderDto,
  FindProvidersQueryDto,
  ProviderResponseDto,
  UpdateProviderDto,
} from './dto/provider.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ช่าง / ผู้ให้บริการ')
@ApiBearerAuth()
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'รายชื่อผู้ให้บริการ' })
  findAll(@Query() query: FindProvidersQueryDto): Promise<PaginatedResponse<ProviderResponseDto>> {
    return this.providers.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ข้อมูลผู้ให้บริการรายคน' })
  findOne(@Param('id') id: string): Promise<ProviderResponseDto> {
    return this.providers.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'เพิ่มผู้ให้บริการ' })
  create(@Body() dto: CreateProviderDto): Promise<ProviderResponseDto> {
    return this.providers.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'แก้ไขข้อมูลผู้ให้บริการ' })
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto): Promise<ProviderResponseDto> {
    return this.providers.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'ปิดการใช้งานผู้ให้บริการ' })
  deactivate(@Param('id') id: string): Promise<void> {
    return this.providers.deactivate(id);
  }
}
