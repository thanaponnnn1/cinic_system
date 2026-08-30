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
import { CustomersService } from './customers.service';
import { CustomerResponseDto } from './dto/customer-response.dto';
import {
  CreateCustomerDto,
  FindCustomersQueryDto,
  UpdateConsentDto,
  UpdateCustomerDto,
} from './dto/customer-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('ลูกค้า')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'รายชื่อลูกค้า',
    description:
      'ผู้ใช้ระดับดูอย่างเดียว (VIEWER) จะไม่ได้รับเบอร์โทร ประวัติการมา และบันทึกของพนักงาน',
  })
  findAll(
    @Query() query: FindCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<CustomerResponseDto>> {
    return this.customers.findAll(query, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ข้อมูลลูกค้ารายคน' })
  @ApiResponse({ status: 404, description: 'ไม่พบลูกค้ารายนี้' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customers.findOne(id, user.role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'เพิ่มลูกค้าใหม่' })
  @ApiResponse({ status: 409, description: 'เบอร์โทรนี้มีอยู่ในระบบแล้ว' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customers.create(dto, user.role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'แก้ไขข้อมูลลูกค้า' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customers.update(id, dto, user.role);
  }

  @Patch(':id/consent')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'แก้ไขความยินยอมรับข้อความ',
    description: 'ทุกครั้งที่ค่าความยินยอมเปลี่ยน ระบบจะบันทึกเวลาที่ให้ความยินยอมใหม่เสมอ',
  })
  updateConsent(
    @Param('id') id: string,
    @Body() dto: UpdateConsentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customers.updateConsent(id, dto, user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'ปิดการใช้งานลูกค้า',
    description: 'ไม่ได้ลบข้อมูลจริง เพราะประวัตินัดยังต้องอ้างถึงลูกค้ารายนี้ได้',
  })
  deactivate(@Param('id') id: string): Promise<void> {
    return this.customers.deactivate(id);
  }

  @Post(':id/reactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'เปิดการใช้งานลูกค้าอีกครั้ง' })
  reactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    return this.customers.reactivate(id, user.role);
  }
}
