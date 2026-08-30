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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CoursesService } from './courses.service';
import {
  CoursePackageResponseDto,
  CreateCoursePackageDto,
  CustomerCourseResponseDto,
  ExpiringCoursesQueryDto,
  FindCoursePackagesQueryDto,
  FindCustomerCoursesQueryDto,
  PurchaseCourseDto,
  UpdateCoursePackageDto,
} from './dto/course.dto';

@ApiTags('คอร์ส')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // ── แม่แบบคอร์สที่ร้านขาย ───────────────────────────────

  @Get('packages')
  @ApiOperation({ summary: 'รายการแม่แบบคอร์ส' })
  findPackages(
    @Query() query: FindCoursePackagesQueryDto,
  ): Promise<PaginatedResponse<CoursePackageResponseDto>> {
    return this.courses.findPackages(query);
  }

  @Get('packages/:id')
  @ApiOperation({ summary: 'ข้อมูลแม่แบบคอร์สรายการเดียว' })
  findPackage(@Param('id') id: string): Promise<CoursePackageResponseDto> {
    return this.courses.findPackage(id);
  }

  @Post('packages')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'เพิ่มคอร์สที่ขาย' })
  createPackage(@Body() dto: CreateCoursePackageDto): Promise<CoursePackageResponseDto> {
    return this.courses.createPackage(dto);
  }

  @Patch('packages/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'แก้ไขคอร์สที่ขาย',
    description: 'แก้อายุคอร์สที่นี่ไม่ย้อนไปเปลี่ยนวันหมดอายุของคนที่ซื้อไปแล้ว',
  })
  updatePackage(
    @Param('id') id: string,
    @Body() dto: UpdateCoursePackageDto,
  ): Promise<CoursePackageResponseDto> {
    return this.courses.updatePackage(id, dto);
  }

  @Delete('packages/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'เลิกขายคอร์สนี้' })
  deactivatePackage(@Param('id') id: string): Promise<void> {
    return this.courses.deactivatePackage(id);
  }

  // ── คอร์สที่ลูกค้าซื้อ ──────────────────────────────────

  @Get('expiring')
  @ApiOperation({
    summary: 'คอร์สที่ใกล้หมดอายุและยังมีครั้งเหลือ',
    description: 'รายชื่อที่ร้านควรโทรตาม เรียงตามวันหมดอายุ',
  })
  findExpiring(
    @Query() query: ExpiringCoursesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerCourseResponseDto[]> {
    return this.courses.findExpiring(query, user.role);
  }

  @Get('purchases')
  @ApiOperation({ summary: 'คอร์สที่ลูกค้าซื้อไว้' })
  findPurchases(
    @Query() query: FindCustomerCoursesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<CustomerCourseResponseDto>> {
    return this.courses.findPurchases(query, user.role);
  }

  @Post('purchases')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'บันทึกการซื้อคอร์ส',
    description: 'วันหมดอายุ = วันที่ซื้อ + อายุคอร์สของแม่แบบ ณ ตอนนั้น',
  })
  @ApiResponse({ status: 400, description: 'คอร์สเลิกขายแล้ว หรือลูกค้าถูกปิดการใช้งาน' })
  purchase(
    @Body() dto: PurchaseCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomerCourseResponseDto> {
    return this.courses.purchase(dto, user.role);
  }
}
