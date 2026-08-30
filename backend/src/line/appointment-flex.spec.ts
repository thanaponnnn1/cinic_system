import { BRAND, MsgType } from '@clinicq/shared';
import { buildAppointmentReminderFlex } from './appointment-flex';
import { PostbackAction, parsePostback } from './postback-data';

const APPOINTMENT = {
  appointmentId: 'appt_1',
  customerName: 'สมหญิง ใจดี',
  serviceName: 'ทรีตเมนต์ผิวหน้า',
  providerName: 'คุณแอน',
  startsAt: new Date('2026-09-02T03:30:00.000Z'), // 10:30 น. ตามเวลาไทย
};

/** เดินทั้งต้นไม้ของ Flex แล้วคืน node ที่ตรงเงื่อนไข — เทสต์จะได้ไม่ผูกกับโครงสร้างที่แน่นอน */
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

describe('buildAppointmentReminderFlex', () => {
  const flex = buildAppointmentReminderFlex(APPOINTMENT, MsgType.REMINDER_1D);

  it('มี altText ที่อ่านรู้เรื่องบนหน้า lock screen ที่ยังไม่เห็น Flex', () => {
    expect(flex.altText).toContain('นัด');
    expect(flex.altText).toContain('10:30');
  });

  it('บอกวัน เวลา บริการ และชื่อผู้ให้บริการ ครบในข้อความเดียว', () => {
    const text = allText(flex.contents);

    expect(text).toContain('10:30');
    expect(text).toContain('ทรีตเมนต์ผิวหน้า');
    expect(text).toContain('คุณแอน');
    expect(text).toContain('สมหญิง ใจดี');
  });

  it('ใช้สีแบรนด์ชุดเดียวกับหน้าจอ dashboard', () => {
    const colors = JSON.stringify(flex.contents);

    expect(colors).toContain(BRAND.navy);
    expect(colors).toContain(BRAND.gold);
  });

  it('มีปุ่มยืนยันที่ส่ง postback พร้อม appointmentId', () => {
    const buttons = collect(flex.contents, (n) => n.type === 'button');
    const actions = buttons.map((b) => b.action as { type: string; data?: string; label?: string });
    const confirm = actions.find(
      (a) => parsePostback(a.data ?? '')?.action === PostbackAction.CONFIRM,
    );

    expect(confirm?.type).toBe('postback');
    expect(parsePostback(confirm?.data ?? '')?.appointmentId).toBe('appt_1');
    expect(confirm?.label).toContain('ยืนยัน');
  });

  it('มีปุ่มขอเลื่อนนัดที่ส่ง postback พร้อม appointmentId', () => {
    const buttons = collect(flex.contents, (n) => n.type === 'button');
    const actions = buttons.map((b) => b.action as { type: string; data?: string; label?: string });
    const reschedule = actions.find(
      (a) => parsePostback(a.data ?? '')?.action === PostbackAction.RESCHEDULE,
    );

    expect(reschedule?.type).toBe('postback');
    expect(parsePostback(reschedule?.data ?? '')?.appointmentId).toBe('appt_1');
    expect(reschedule?.label).toContain('เลื่อน');
  });

  it('ข้อความเตือนก่อน 2 ชั่วโมง บอกว่าใกล้ถึงเวลาแล้ว ไม่ใช่คำเดียวกับเตือนล่วงหน้า 1 วัน', () => {
    const twoHours = buildAppointmentReminderFlex(APPOINTMENT, MsgType.REMINDER_2H);

    expect(allText(twoHours.contents)).not.toBe(allText(flex.contents));
  });

  it('ไม่มีเบอร์โทรหรือข้อมูลอ่อนไหวหลุดลงในข้อความ — ข้อกำหนด PDPA', () => {
    const payload = JSON.stringify(flex);

    expect(payload).not.toMatch(/0\d{8,9}/);
  });
});
