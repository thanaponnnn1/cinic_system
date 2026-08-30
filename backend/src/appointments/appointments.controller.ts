import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, type PaginatedResponse } from '@clinicq/shared';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentResponseDto,
  AvailabilitySlotDto,
  DayBoardDto,
} from './dto/appointment-response.dto';
import {
  AvailabilityQueryDto,
  CancelAppointmentDto,
  CompleteAppointmentDto,
  CreateAppointmentDto,
  DayBoardQueryDto,
  FindAppointmentsQueryDto,
  RescheduleAppointmentDto,
} from './dto/appointment-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('นัดหมาย')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'รายการนัด', description: 'กรองตามวัน ช่วงเวลา ช่าง ลูกค้า หรือสถานะ' })
  findAll(
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponse<AppointmentResponseDto>> {
    return this.appointments.findAll(query, user.role);
  }

  @Get('day-board')
  @ApiOperation({
    summary: 'คิวทั้งวันแยกตามช่าง',
    description: 'ข้อมูลของหน้าบอร์ดคิว พร้อมยอดนับแยกสถานะและรายได้ที่คาดว่าจะได้',
  })
  dayBoard(
    @Query() query: DayBoardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DayBoardDto> {
    return this.appointments.dayBoard(query, user.role);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'ช่องเวลาว่างของช่าง',
    description: 'คืนเฉพาะช่องที่ยาวพอสำหรับบริการที่เลือก',
  })
  availability(@Query() query: AvailabilityQueryDto): Promise<AvailabilitySlotDto[]> {
    return this.appointments.availability(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ข้อมูลนัดรายการเดียว' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.findOne(id, user.role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'สร้างนัดใหม่',
    description: 'เวลาสิ้นสุดคำนวณจากระยะเวลาของบริการให้อัตโนมัติ',
  })
  @ApiResponse({ status: 409, description: 'ช่วงเวลานี้ชนกับคิวอื่นของช่างคนเดียวกัน' })
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.create(dto, user.id, user.role);
  }

  @Post(':id/reschedule')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ย้ายนัดไปเวลาใหม่',
    description: 'ใบเดิมถูกยกเลิกและออกใบใหม่ให้ เพื่อให้ประวัติการย้ายยังตรวจสอบได้',
  })
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.reschedule(id, dto, user.id, user.role);
  }

  @Patch(':id/confirm')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ยืนยันนัด',
    description: 'ใช้ตอนพนักงานยืนยันแทนลูกค้า เช่น ยืนยันทางโทรศัพท์',
  })
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.confirm(id, user.role);
  }

  @Patch(':id/request-reschedule')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'บันทึกว่าลูกค้าขอเลื่อนนัด',
    description: 'นัดจะค้างสถานะนี้ไว้จนพนักงานติดต่อกลับและย้ายไปเวลาใหม่',
  })
  requestReschedule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.requestReschedule(id, user.role);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ยกเลิกนัด' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.cancel(id, dto, user.role);
  }

  @Patch(':id/no-show')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'บันทึกว่าลูกค้าไม่มาตามนัด' })
  noShow(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.noShow(id, user.role);
  }

  @Patch(':id/complete')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({
    summary: 'ปิดงาน — ลูกค้ารับบริการเรียบร้อย',
    description: 'อัปเดตวันที่มาล่าสุดของลูกค้า และตัดครั้งคอร์สให้ในคราวเดียวกัน',
  })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointments.complete(id, dto, user.role);
  }
}
