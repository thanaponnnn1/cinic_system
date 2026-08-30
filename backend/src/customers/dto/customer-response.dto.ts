import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@clinicq/shared';

/** รูปร่างของข้อมูลลูกค้าที่อ่านจากฐานข้อมูล (เฉพาะฟิลด์ที่ DTO นี้ใช้) */
interface CustomerEntity {
  id: string;
  name: string;
  phone: string;
  lineUserId: string | null;
  consentReminder: boolean;
  consentMarketing: boolean;
  consentAt: Date | null;
  lastVisitAt: Date | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
}

/**
 * ข้อมูลลูกค้าที่ส่งออกจาก API
 *
 * ตัวนี้คือจุดที่ข้อกำหนด PDPA กลายเป็นโค้ดจริง — ผู้ใช้ระดับ VIEWER
 * จะได้ข้อมูลกลับไปน้อยกว่าระดับอื่น โดยฟิลด์ที่ปิดไม่ได้ถูกส่งออกไปแล้วซ่อนที่หน้าจอ
 * แต่ **ไม่ถูกใส่ลงใน response ตั้งแต่ต้น** ซึ่งเป็นคนละเรื่องกันโดยสิ้นเชิง
 *
 * เขียนเป็นฟังก์ชันธรรมดาแทนการใช้ decorator ซ่อนความหมาย เพราะอยากให้คนที่มาอ่านโค้ด
 * ต่อจากเรา (รวมถึงฝั่งลูกค้า) เห็นกฎได้ในบรรทัดเดียวว่าใครเห็นอะไรบ้าง
 */
export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'ระดับ VIEWER จะไม่ได้รับฟิลด์นี้' })
  phone?: string;

  @ApiPropertyOptional({ description: 'ผูกบัญชี LINE แล้วหรือยัง' })
  hasLineLinked?: boolean;

  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความเตือนนัด' })
  consentReminder?: boolean;

  @ApiPropertyOptional({ description: 'ยินยอมรับข้อความการตลาด' })
  consentMarketing?: boolean;

  @ApiPropertyOptional({ description: 'เวลาที่ให้ความยินยอมล่าสุด' })
  consentAt?: Date | null;

  @ApiPropertyOptional({ description: 'วันที่มารับบริการครั้งล่าสุด' })
  lastVisitAt?: Date | null;

  @ApiPropertyOptional({ description: 'จำนวนวันที่ไม่ได้มา — null คือยังไม่เคยมา' })
  daysSinceLastVisit?: number | null;

  @ApiPropertyOptional()
  note?: string | null;

  static from(customer: CustomerEntity, viewerRole: Role): CustomerResponseDto {
    const base: CustomerResponseDto = {
      id: customer.id,
      name: customer.name,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
    };

    // VIEWER ดูตารางนัดได้ จึงต้องเห็นชื่อลูกค้า แต่ไม่มีเหตุผลทางธุรกิจใด
    // ที่ต้องเห็นเบอร์โทร ประวัติการมา หรือบันทึกของพนักงาน
    if (viewerRole === Role.VIEWER) {
      return base;
    }

    return {
      ...base,
      phone: customer.phone,
      hasLineLinked: customer.lineUserId !== null,
      consentReminder: customer.consentReminder,
      consentMarketing: customer.consentMarketing,
      consentAt: customer.consentAt,
      lastVisitAt: customer.lastVisitAt,
      daysSinceLastVisit: daysSince(customer.lastVisitAt),
      note: customer.note,
    };
  }
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
