import { LIFF_PATH, liffUrl } from './liff-url';

describe('liffUrl', () => {
  it('ประกอบลิงก์ LIFF พร้อม path ของหน้า', () => {
    expect(liffUrl('2001234567-AbCdEfGh', LIFF_PATH.book)).toBe(
      'https://liff.line.me/2001234567-AbCdEfGh/c/book',
    );
  });

  it('ไม่ส่ง path ได้ลิงก์หน้าแรกของ LIFF app', () => {
    expect(liffUrl('2001234567-AbCdEfGh')).toBe('https://liff.line.me/2001234567-AbCdEfGh');
  });

  it('ไม่มี LIFF ID ไม่มีลิงก์ ข้อความจึงกลับไปเป็นแบบเดิม', () => {
    expect(liffUrl(undefined, LIFF_PATH.courses)).toBeUndefined();
    expect(liffUrl('', LIFF_PATH.courses)).toBeUndefined();
  });
});
