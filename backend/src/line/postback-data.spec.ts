import { PostbackAction, encodePostback, parsePostback } from './postback-data';

describe('postback data', () => {
  it('ประกอบและถอดกลับได้ค่าเดิม', () => {
    const data = encodePostback({ action: PostbackAction.CONFIRM, appointmentId: 'appt_1' });

    expect(parsePostback(data)).toEqual({
      action: PostbackAction.CONFIRM,
      appointmentId: 'appt_1',
    });
  });

  it('รองรับการขอเลื่อนนัด', () => {
    const data = encodePostback({ action: PostbackAction.RESCHEDULE, appointmentId: 'appt_2' });

    expect(parsePostback(data)?.action).toBe(PostbackAction.RESCHEDULE);
  });

  it('อยู่ในโควตา 300 ตัวอักษรที่ LINE จำกัดไว้ต่อหนึ่งปุ่ม', () => {
    const data = encodePostback({ action: PostbackAction.CONFIRM, appointmentId: 'c'.repeat(30) });

    expect(data.length).toBeLessThanOrEqual(300);
  });

  it('คืน null เมื่อ action ไม่ใช่ค่าที่ระบบรู้จัก — กันคนยิง data ที่แต่งเอง', () => {
    expect(parsePostback('action=ลบทิ้ง&appointmentId=appt_1')).toBeNull();
  });

  it('คืน null เมื่อไม่มี appointmentId', () => {
    expect(parsePostback('action=confirm')).toBeNull();
  });

  it('คืน null เมื่อ data ว่าง', () => {
    expect(parsePostback('')).toBeNull();
  });
});
