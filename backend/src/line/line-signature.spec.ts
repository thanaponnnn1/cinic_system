import { createHmac } from 'node:crypto';
import { verifyLineSignature } from './line-signature';

const SECRET = 'channel-secret-for-tests';
const BODY = JSON.stringify({ destination: 'U0', events: [] });

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('base64');
}

describe('verifyLineSignature', () => {
  it('ยอมรับลายเซ็นที่เซ็นจาก body และ secret เดียวกัน', () => {
    expect(verifyLineSignature(Buffer.from(BODY), sign(BODY), SECRET)).toBe(true);
  });

  it('ปฏิเสธเมื่อ body ถูกแก้หลังเซ็น — กันคนปลอม event ยิงเข้ามาเปลี่ยนสถานะนัด', () => {
    const signature = sign(BODY);
    const tampered = JSON.stringify({ destination: 'U0', events: [{ type: 'postback' }] });

    expect(verifyLineSignature(Buffer.from(tampered), signature, SECRET)).toBe(false);
  });

  it('ปฏิเสธเมื่อเซ็นด้วย secret คนละตัว', () => {
    expect(verifyLineSignature(Buffer.from(BODY), sign(BODY, 'secret-อื่น'), SECRET)).toBe(false);
  });

  it('ปฏิเสธเมื่อไม่มี header ส่งมา', () => {
    expect(verifyLineSignature(Buffer.from(BODY), undefined, SECRET)).toBe(false);
  });

  it('ปฏิเสธลายเซ็นที่ความยาวไม่ตรง โดยไม่โยน error', () => {
    expect(verifyLineSignature(Buffer.from(BODY), 'สั้นเกิน', SECRET)).toBe(false);
  });

  it('ปฏิเสธเมื่อยังไม่ได้ตั้ง secret — ปิดไว้ก่อนดีกว่าเปิดรับทุกคน', () => {
    expect(verifyLineSignature(Buffer.from(BODY), sign(BODY), '')).toBe(false);
  });
});
