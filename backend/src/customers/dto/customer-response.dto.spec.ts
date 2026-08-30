import { Role } from '@clinicq/shared';
import { CustomerResponseDto } from './customer-response.dto';

/**
 * เทสต์ชุดนี้คือหลักประกันของข้อกำหนด PDPA ที่ขายลูกค้าไว้
 *
 * ถ้ามีใครเผลอเพิ่มฟิลด์ที่เป็นข้อมูลส่วนบุคคลเข้าไปในผลลัพธ์ของระดับ VIEWER
 * เทสต์ต้องแดงทันที ไม่ใช่ไปรู้ตอนข้อมูลหลุดแล้ว
 */
describe('CustomerResponseDto', () => {
  const customer = {
    id: 'cus_1',
    name: 'สมหญิง ใจดี',
    phone: '0812345678',
    lineUserId: 'U0001abcdef',
    consentReminder: true,
    consentMarketing: false,
    consentAt: new Date('2026-01-15T03:00:00.000Z'),
    lastVisitAt: new Date('2026-08-20T03:00:00.000Z'),
    note: 'ชอบให้โทรยืนยันก่อนล่วงหน้า',
    isActive: true,
    createdAt: new Date('2025-06-01T03:00:00.000Z'),
  };

  describe('ระดับดูอย่างเดียว (VIEWER)', () => {
    const result = CustomerResponseDto.from(customer, Role.VIEWER);

    it('เห็นเฉพาะข้อมูลที่จำเป็นต่อการดูตารางนัด', () => {
      expect(result).toEqual({
        id: 'cus_1',
        name: 'สมหญิง ใจดี',
        isActive: true,
        createdAt: customer.createdAt,
      });
    });

    it.each([
      ['phone', 'เบอร์โทร'],
      ['note', 'บันทึกของพนักงาน'],
      ['lastVisitAt', 'ประวัติการมา'],
      ['consentReminder', 'สถานะความยินยอม'],
      ['consentMarketing', 'สถานะความยินยอม'],
      ['consentAt', 'เวลาที่ให้ความยินยอม'],
      ['hasLineLinked', 'สถานะการผูก LINE'],
      ['daysSinceLastVisit', 'จำนวนวันที่ไม่ได้มา'],
    ])('ไม่มีฟิลด์ %s (%s) อยู่ใน response เลย', (field) => {
      // ต้องไม่มี key นี้อยู่จริง ไม่ใช่แค่มีค่าเป็น undefined
      // เพราะการ "ส่งไปแล้วให้หน้าจอซ่อน" ไม่ถือว่าปกป้องข้อมูล
      expect(Object.keys(result)).not.toContain(field);
    });
  });

  describe.each([
    [Role.ADMIN, 'ผู้ดูแลระบบ'],
    [Role.STAFF, 'พนักงาน'],
  ])('ระดับ %s (%s)', (role, _label) => {
    const result = CustomerResponseDto.from(customer, role);

    it('เห็นเบอร์โทรและบันทึกได้ เพราะต้องใช้ติดต่อลูกค้าจริง', () => {
      expect(result.phone).toBe('0812345678');
      expect(result.note).toBe('ชอบให้โทรยืนยันก่อนล่วงหน้า');
    });

    it('เห็นสถานะความยินยอมพร้อมเวลาที่ให้ไว้', () => {
      expect(result.consentReminder).toBe(true);
      expect(result.consentMarketing).toBe(false);
      expect(result.consentAt).toEqual(customer.consentAt);
    });

    it('บอกว่าผูก LINE แล้วหรือยัง โดยไม่เปิดเผยตัว userId', () => {
      expect(result.hasLineLinked).toBe(true);
      expect(Object.keys(result)).not.toContain('lineUserId');
    });
  });

  describe('จำนวนวันที่ไม่ได้มา', () => {
    it('นับจากวันที่มาครั้งล่าสุด', () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
      const result = CustomerResponseDto.from(
        { ...customer, lastVisitAt: ninetyDaysAgo },
        Role.STAFF,
      );

      expect(result.daysSinceLastVisit).toBe(90);
    });

    it('เป็น null เมื่อลูกค้ายังไม่เคยมา — ต่างจาก 0 ที่แปลว่ามาวันนี้', () => {
      const result = CustomerResponseDto.from({ ...customer, lastVisitAt: null }, Role.STAFF);

      expect(result.daysSinceLastVisit).toBeNull();
      expect(result.lastVisitAt).toBeNull();
    });
  });
});
