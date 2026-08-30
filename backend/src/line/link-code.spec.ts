import { extractLinkCode, generateLinkCode } from './link-code';

describe('generateLinkCode', () => {
  it('คืนรหัส 6 หลักที่ไม่ขึ้นต้นด้วยศูนย์ — พนักงานอ่านให้ลูกค้าฟังทางโทรศัพท์ได้', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateLinkCode()).toMatch(/^[1-9]\d{5}$/);
    }
  });

  it('ไม่ออกค่าเดิมซ้ำ ๆ ติดกัน', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateLinkCode()));

    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('extractLinkCode', () => {
  it('อ่านรหัสจากข้อความที่พิมพ์มาเปล่า ๆ', () => {
    expect(extractLinkCode('123456')).toBe('123456');
  });

  it('ตัดช่องว่างหน้าหลังทิ้ง', () => {
    expect(extractLinkCode('  123456  ')).toBe('123456');
  });

  it('อ่านรหัสที่ปนมากับข้อความ เพราะลูกค้าจริงพิมพ์ตามที่พนักงานบอก', () => {
    expect(extractLinkCode('รหัส 482913 ครับ')).toBe('482913');
  });

  it('ไม่รับเลขที่สั้นหรือยาวกว่า 6 หลัก', () => {
    expect(extractLinkCode('12345')).toBeNull();
    expect(extractLinkCode('1234567')).toBeNull();
  });

  it('คืน null เมื่อไม่มีตัวเลขในข้อความ', () => {
    expect(extractLinkCode('สวัสดีครับ อยากจองคิว')).toBeNull();
  });

  it('ไม่หยิบเลข 6 หลักที่ติดอยู่กลางเลขยาว เช่น เบอร์โทร', () => {
    expect(extractLinkCode('0812345678')).toBeNull();
  });
});
