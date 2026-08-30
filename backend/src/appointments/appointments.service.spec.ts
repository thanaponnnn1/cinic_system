import { isSlotExclusionViolation } from './appointments.service';

/**
 * ตัวตรวจจับการชน exclusion constraint
 *
 * เส้นทางนี้ทดสอบผ่าน HTTP ยาก เพราะ advisory lock กันไว้ก่อนเสมอ
 * แต่ตัวตรวจต้องถูกต้องไว้ก่อน เผื่อวันที่มีคนเขียนนัดโดยไม่ผ่าน lockProvider
 * (สคริปต์นำเข้าข้อมูล หรือโค้ดใหม่ในอนาคต) — วันนั้นต้องได้ 409 ไม่ใช่ 500
 */
describe('isSlotExclusionViolation', () => {
  it('จับได้จากรหัส error ของ Postgres ตรง ๆ', () => {
    expect(isSlotExclusionViolation({ code: '23P01' })).toBe(true);
  });

  it('จับได้เมื่อรหัสถูกห่อไว้ใน meta', () => {
    expect(isSlotExclusionViolation({ code: 'P2010', meta: { code: '23P01' } })).toBe(true);
  });

  it('จับได้จากชื่อ constraint ในข้อความ', () => {
    expect(
      isSlotExclusionViolation({
        message:
          'conflicting key value violates exclusion constraint "Appointment_provider_no_overlap"',
      }),
    ).toBe(true);
  });

  it.each([
    ['เบอร์ซ้ำ', { code: 'P2002' }],
    ['หาไม่เจอ', { code: 'P2025' }],
    ['constraint อื่น', { message: 'violates unique constraint "Customer_phone_key"' }],
    ['error ทั่วไป', new Error('boom')],
    ['null', null],
    ['undefined', undefined],
    ['สตริงเปล่า', ''],
  ])('ไม่เหมาเอาว่าเป็นนัดซ้อน: %s', (_label, input) => {
    expect(isSlotExclusionViolation(input)).toBe(false);
  });
});
