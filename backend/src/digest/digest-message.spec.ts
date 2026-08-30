import { formatDailyDigest } from './digest-message';

const SUMMARY = {
  date: new Date('2026-08-31T03:00:00.000Z'),
  revenue: 6800,
  completed: 5,
  noShow: 1,
  cancelled: 2,
  byProvider: [
    { name: 'คุณฟ้า', completed: 3, revenue: 4200 },
    { name: 'คุณเบส', completed: 2, revenue: 2600 },
  ],
  tomorrowCount: 7,
};

describe('formatDailyDigest', () => {
  const text = formatDailyDigest(SUMMARY);

  it('พาดหัวด้วยวันที่แบบไทย เจ้าของร้านจะได้รู้ว่าเป็นสรุปของวันไหน', () => {
    expect(text).toContain('จันทร์ 31 ส.ค. 2569');
  });

  it('บอกรายได้พร้อมคั่นหลักพัน อ่านเร็วบนมือถือ', () => {
    expect(text).toContain('6,800');
  });

  it('บอกจำนวนเคสที่ปิดงาน ไม่มาตามนัด และยกเลิก', () => {
    expect(text).toContain('5');
    expect(text).toContain('ไม่มาตามนัด 1');
    expect(text).toContain('ยกเลิก 2');
  });

  it('แยกตัวเลขรายช่าง เพราะเจ้าของร้านใช้ตัวเลขนี้คิดค่าคอมมิชชั่น', () => {
    expect(text).toContain('คุณฟ้า');
    expect(text).toContain('4,200');
    expect(text).toContain('คุณเบส');
  });

  it('บอกจำนวนคิวของพรุ่งนี้ เพื่อให้เตรียมของและกำลังคนได้ตั้งแต่คืนนี้', () => {
    expect(text).toContain('พรุ่งนี้');
    expect(text).toContain('7');
  });

  it('วันที่ไม่มีเคสก็ยังส่ง และบอกตรง ๆ ว่าวันนี้ไม่มีเคสปิดงาน', () => {
    const quiet = formatDailyDigest({
      ...SUMMARY,
      revenue: 0,
      completed: 0,
      noShow: 0,
      cancelled: 0,
      byProvider: [],
      tomorrowCount: 0,
    });

    expect(quiet).toContain('ไม่มีเคสที่ปิดงาน');
  });

  it('ไม่มีชื่อลูกค้าหรือรายละเอียดการรักษาในสรุป — ข้อความนี้ส่งออกนอกระบบ (PDPA)', () => {
    expect(text).not.toMatch(/0\d{8,9}/);
    expect(text.split('\n').length).toBeLessThan(20);
  });
});
