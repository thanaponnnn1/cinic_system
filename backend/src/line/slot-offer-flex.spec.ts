import { BRAND } from '@clinicq/shared';
import { buildSlotOfferFlex } from './slot-offer-flex';
import { PostbackAction, parsePostback } from './postback-data';

const OFFER = {
  waitlistEntryId: 'wl_1',
  customerName: 'สมหญิง ใจดี',
  serviceName: 'ทรีตเมนต์ผิวหน้า',
  providerName: 'คุณแอน',
  slotStart: new Date('2026-09-02T03:30:00.000Z'), // 10:30 น. ตามเวลาไทย
  expiresAt: new Date('2026-09-01T04:00:00.000Z'), // 11:00 น. ตามเวลาไทย
};

function collect(
  node: unknown,
  match: (n: Record<string, unknown>) => boolean,
): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap((child) => collect(child, match));
  if (node === null || typeof node !== 'object') return [];

  const current = node as Record<string, unknown>;
  const children = Object.values(current).flatMap((value) => collect(value, match));

  return match(current) ? [current, ...children] : children;
}

function allText(node: unknown): string {
  return collect(node, (n) => n.type === 'text')
    .map((n) => String(n.text ?? ''))
    .join(' | ');
}

describe('buildSlotOfferFlex', () => {
  const flex = buildSlotOfferFlex(OFFER);

  it('altText บอกทันทีว่ามีคิวว่าง เพราะข้อความนี้ต้องแย่งความสนใจให้ได้ใน 30 นาที', () => {
    expect(flex.altText).toContain('คิวว่าง');
    expect(flex.altText).toContain('10:30');
  });

  it('บอกวัน เวลา บริการ และผู้ให้บริการของคิวที่ว่าง', () => {
    const text = allText(flex.contents);

    expect(text).toContain('10:30');
    expect(text).toContain('ทรีตเมนต์ผิวหน้า');
    expect(text).toContain('คุณแอน');
  });

  it('บอกเส้นตายให้ชัด — ลูกค้าต้องรู้ว่าช้ากว่านี้คิวหลุด', () => {
    const text = allText(flex.contents);

    expect(text).toContain('11:00');
  });

  it('มีปุ่มรับคิวที่ส่ง waitlistEntryId กลับมา', () => {
    const buttons = collect(flex.contents, (n) => n.type === 'button');
    const action = buttons[0]?.action as { type: string; data?: string; label?: string };
    const payload = parsePostback(action?.data ?? '');

    expect(action.type).toBe('postback');
    expect(payload).toEqual({ action: PostbackAction.CLAIM_SLOT, waitlistEntryId: 'wl_1' });
    expect(action.label).toContain('จอง');
  });

  it('มีปุ่มเดียว — ปุ่มปฏิเสธไม่จำเป็นเพราะไม่กดก็หมดเวลาเอง และยิ่งปุ่มน้อยยิ่งกดเร็ว', () => {
    expect(collect(flex.contents, (n) => n.type === 'button')).toHaveLength(1);
  });

  it('ใช้สีแบรนด์ชุดเดียวกับข้อความอื่นของร้าน', () => {
    const payload = JSON.stringify(flex.contents);

    expect(payload).toContain(BRAND.navy);
    expect(payload).toContain(BRAND.gold);
  });

  it('ไม่มีเบอร์โทรหรือข้อมูลอ่อนไหวในข้อความ (PDPA)', () => {
    expect(JSON.stringify(flex)).not.toMatch(/0\d{8,9}/);
  });
});
