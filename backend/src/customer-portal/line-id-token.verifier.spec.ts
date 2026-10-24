import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { LineIdTokenVerifier } from './line-id-token.verifier';

describe('LineIdTokenVerifier', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  let channelId: string | undefined;

  const verifier = new LineIdTokenVerifier({
    get: () => channelId,
  } as unknown as ConfigService);

  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  beforeEach(() => {
    fetchMock.mockReset();
    channelId = '2001234567';
  });

  it('คืน lineUserId จาก sub ที่ LINE ยืนยันให้', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ sub: 'Uabc123', name: 'สมหญิง' }), { status: 200 }),
    );

    await expect(verifier.verify('id-token')).resolves.toEqual({
      lineUserId: 'Uabc123',
      displayName: 'สมหญิง',
    });
  });

  it('ส่ง id_token กับ client_id แบบ form ไปที่ endpoint verify ของ LINE', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ sub: 'Uabc123' }), { status: 200 }));

    await verifier.verify('id-token');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.line.me/oauth2/v2.1/verify');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get('id_token')).toBe('id-token');
    expect(body.get('client_id')).toBe('2001234567');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('token ที่ LINE ไม่รับ (หมดอายุ ปลอม หรือของ channel อื่น) ได้ 401', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400 }),
    );

    await expect(verifier.verify('forged')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('คำตอบที่ไม่มี sub ไม่ถือว่ายืนยันตัวตนผ่าน', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ยังไม่ได้ตั้ง LINE_LIFF_CHANNEL_ID ได้ 503 โดยไม่ยิงหา LINE เลย', async () => {
    channelId = undefined;

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ติดต่อ LINE ไม่ได้หรือเกินเวลา ได้ 503 ไม่ใช่ 401 — ลูกค้าไม่ได้ทำอะไรผิด', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    await expect(verifier.verify('id-token')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
