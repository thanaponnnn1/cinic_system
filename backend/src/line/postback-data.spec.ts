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

describe('postback ของปุ่มรับคิวว่าง', () => {
  it('ประกอบและถอดกลับได้ค่าเดิม', () => {
    const data = encodePostback({ action: PostbackAction.CLAIM_SLOT, waitlistEntryId: 'wl_1' });

    expect(parsePostback(data)).toEqual({
      action: PostbackAction.CLAIM_SLOT,
      waitlistEntryId: 'wl_1',
    });
  });

  it('ปุ่มรับคิวว่างที่ไม่มี waitlistEntryId ถือว่าใช้ไม่ได้', () => {
    expect(parsePostback('action=claim-slot')).toBeNull();
  });

  it('ปุ่มรับคิวว่างที่แนบ appointmentId มาแทนต้องไม่ผ่าน — กันเดา id ของนัดคนอื่น', () => {
    expect(parsePostback('action=claim-slot&appointmentId=appt_1')).toBeNull();
  });

  it('ปุ่มยืนยันนัดที่แนบ waitlistEntryId มาแทน appointmentId ก็ต้องไม่ผ่านเช่นกัน', () => {
    expect(parsePostback('action=confirm&waitlistEntryId=wl_1')).toBeNull();
  });
});
