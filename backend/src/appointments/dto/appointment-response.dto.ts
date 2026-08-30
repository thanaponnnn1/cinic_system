import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { APPT_STATUS_LABEL, ApptStatus, Role, STATUS_COLOR } from '@clinicq/shared';

interface AppointmentEntity {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: ApptStatus;
  cancelReason: string | null;
  customerCourseId: string | null;
  createdAt: Date;
  customer: { id: string; name: string; phone: string; lineUserId: string | null };
  provider: { id: string; name: string };
  service: { id: string; name: string; durationMin: number; price: { toString(): string } };
}

/**
 * นัดหมายที่ส่งออกจาก API
 *
 * ใช้กฎเดียวกับ CustomerResponseDto: ระดับ VIEWER เห็นตารางนัดได้ครบ
 * แต่ไม่ได้รับเบอร์โทรลูกค้า เพราะไม่มีเหตุผลทางธุรกิจที่ต้องใช้
 */
export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({ enum: ApptStatus })
  status: ApptStatus;

  @ApiProperty({ example: 'ยืนยันแล้ว', description: 'ป้ายภาษาไทยสำหรับแสดงผล' })
  statusLabel: string;

  @ApiProperty({ example: '#3FB984', description: 'สีประจำสถานะ ใช้กับบอร์ดคิวและข้อความใน LINE' })
  statusColor: string;

  @ApiProperty()
  customer: { id: string; name: string; phone?: string; hasLineLinked?: boolean };

  @ApiProperty()
  provider: { id: string; name: string };

  @ApiProperty()
  service: { id: string; name: string; durationMin: number; price: number };

  @ApiPropertyOptional()
  cancelReason?: string | null;

  @ApiPropertyOptional({ description: 'คอร์สที่ตัดครั้งไปกับนัดนี้' })
  customerCourseId?: string | null;

  static from(appt: AppointmentEntity, viewerRole: Role): AppointmentResponseDto {
    return {
      id: appt.id,
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      status: appt.status,
      statusLabel: APPT_STATUS_LABEL[appt.status],
      statusColor: STATUS_COLOR[appt.status],
      customer:
        viewerRole === Role.VIEWER
          ? { id: appt.customer.id, name: appt.customer.name }
          : {
              id: appt.customer.id,
              name: appt.customer.name,
              phone: appt.customer.phone,
              hasLineLinked: appt.customer.lineUserId !== null,
            },
      provider: { id: appt.provider.id, name: appt.provider.name },
      service: {
        id: appt.service.id,
        name: appt.service.name,
        durationMin: appt.service.durationMin,
        price: Number(appt.service.price.toString()),
      },
      cancelReason: appt.cancelReason,
      customerCourseId: appt.customerCourseId,
    };
  }
}

/** สรุปคิวทั้งวัน สำหรับหน้าบอร์ดคิว */
export class DayBoardDto {
  @ApiProperty({ example: '2026-09-01' })
  date: string;

  @ApiProperty({ description: 'จำนวนนัดแยกตามสถานะ' })
  counts: Record<ApptStatus, number>;

  @ApiProperty({ description: 'รายได้ที่คาดว่าจะได้จากคิวที่ยังไม่ถูกยกเลิก' })
  expectedRevenue: number;

  @ApiProperty({ description: 'รายได้จริงจากคิวที่รับบริการเสร็จแล้ว' })
  actualRevenue: number;

  @ApiProperty({ description: 'คิวแยกตามช่าง เรียงตามเวลา' })
  providers: {
    id: string;
    name: string;
    appointments: AppointmentResponseDto[];
  }[];
}

/** ช่องเวลาว่างของช่างในวันหนึ่ง */
export class AvailabilitySlotDto {
  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;
}
