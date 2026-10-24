import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CurrentCustomer } from './current-customer.decorator';
import type { AuthenticatedCustomer } from './customer-session';
import type { TimeSlot } from './bookable-slots';
import type {
  CustomerAppointment,
  CustomerAppointmentList,
  CustomerCourseView,
  CustomerShop,
} from './customer-portal.types';
import { BookAppointmentDto, CustomerAvailabilityQueryDto } from './dto/customer-portal.dto';

/**
 * หน้าร้าน การจอง และข้อมูลของลูกค้าเอง
 *
 * ติด @Public() ทั้ง controller เพื่อข้าม guard ของพนักงาน แล้วใส่ CustomerAuthGuard
 * ทีละ endpoint — มีแค่หน้าร้านที่เปิดดูได้โดยไม่ต้องเข้าสู่ระบบ
 */
@ApiTags('ลูกค้า (LIFF)')
@Public()
@Controller('customer')
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Get('shop')
  @ApiOperation({ summary: 'ข้อมูลหน้าร้าน บริการ และทีมช่าง', description: 'ไม่ต้องเข้าสู่ระบบ' })
  shop(): Promise<CustomerShop> {
    return this.portal.shop();
  }

  @Get('availability')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ช่องเวลาที่จองเองได้ในวันนั้น',
    description:
      'เฉพาะในเวลาเปิดร้าน ล่วงหน้าอย่างน้อยตาม BUSINESS_HOURS และไม่เกินจำนวนวันที่กำหนด',
  })
  availability(@Query() query: CustomerAvailabilityQueryDto): Promise<TimeSlot[]> {
    return this.portal.availability(query);
  }

  @Post('appointments')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'จองคิว', description: 'ไม่ระบุช่าง = ระบบเลือกช่างที่ว่างให้' })
  @ApiResponse({ status: 409, description: 'ช่องเต็ม (SLOT_TAKEN) หรือจองครบจำนวนแล้ว' })
  book(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: BookAppointmentDto,
  ): Promise<CustomerAppointment> {
    return this.portal.book(customer.id, dto);
  }

  @Get('appointments')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'นัดของฉัน แยกนัดที่จะถึงกับประวัติ' })
  appointments(
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ): Promise<CustomerAppointmentList> {
    return this.portal.listAppointments(customer.id);
  }

  @Patch('appointments/:id/confirm')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ยืนยันว่าจะมาตามนัด' })
  @ApiResponse({ status: 404, description: 'ไม่พบนัด หรือไม่ใช่นัดของคุณ (ตอบเหมือนกัน)' })
  confirm(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') id: string,
  ): Promise<CustomerAppointment> {
    return this.portal.act(customer.id, id, 'confirm');
  }

  @Patch('appointments/:id/request-reschedule')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ขอเลื่อนนัด',
    description: 'ยังไม่ให้เลือกเวลาใหม่เอง — ร้านเห็นสถานะนี้บนบอร์ดคิวแล้วติดต่อกลับ',
  })
  @ApiResponse({ status: 404, description: 'ไม่พบนัด หรือไม่ใช่นัดของคุณ (ตอบเหมือนกัน)' })
  requestReschedule(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') id: string,
  ): Promise<CustomerAppointment> {
    return this.portal.act(customer.id, id, 'requestReschedule');
  }

  @Patch('appointments/:id/cancel')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ยกเลิกนัด',
    description: 'ช่องที่ว่างลงถูกประกาศให้คนในคิวรอทันที เหมือนยกเลิกที่หน้าร้าน',
  })
  @ApiResponse({ status: 404, description: 'ไม่พบนัด หรือไม่ใช่นัดของคุณ (ตอบเหมือนกัน)' })
  cancel(
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Param('id') id: string,
  ): Promise<CustomerAppointment> {
    return this.portal.act(customer.id, id, 'cancel');
  }

  @Get('courses')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'คอร์สของฉัน พร้อมครั้งคงเหลือและวันหมดอายุ' })
  courses(@CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerCourseView[]> {
    return this.portal.courses(customer.id);
  }
}
