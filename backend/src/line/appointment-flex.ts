import type { messagingApi } from '@line/bot-sdk';
import { BRAND, BRAND_INFO, MsgType, STATUS_COLOR } from '@clinicq/shared';
import { formatBangkokTime, formatThaiDate } from '../common/bangkok-time';
import { PostbackAction, encodePostback } from './postback-data';

/** ข้อมูลนัดเท่าที่ข้อความต้องใช้ — ตั้งใจไม่รับ entity ทั้งก้อน เพื่อไม่ให้เบอร์โทรหลุดเข้ามา */
export interface ReminderFlexInput {
  appointmentId: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  startsAt: Date;
}

/** คำนำของแต่ละจังหวะการเตือน — คนละน้ำเสียงเพราะความเร่งด่วนต่างกัน */
const HEADLINE: Partial<Record<MsgType, string>> = {
  [MsgType.REMINDER_1D]: 'พรุ่งนี้คุณมีนัดกับเรา',
  [MsgType.REMINDER_2H]: 'อีกประมาณ 2 ชั่วโมงถึงเวลานัดของคุณ',
};

/**
 * ข้อความเตือนนัดพร้อมปุ่มยืนยัน/ขอเลื่อน
 *
 * นี่คือหน้าตาของร้านที่ลูกค้าเห็นบนมือถือ — ใช้ทอง/กรมท่าชุดเดียวกับ dashboard
 * (shared/src/brand.ts) เพื่อให้แชทกับหน้าจอเป็นแบรนด์เดียวกัน
 *
 * ห้ามใส่รายละเอียดการรักษาหรือเบอร์โทรลงในข้อความ — ข้อความ LINE เห็นได้จากหน้าจอล็อก
 * ของเครื่องลูกค้า จึงต้องสะอาดตั้งแต่ต้นทาง (PDPA, ดู docs/plan-clinic-demo.md ข้อ 10)
 */
export function buildAppointmentReminderFlex(
  appointment: ReminderFlexInput,
  type: MsgType,
): messagingApi.FlexMessage {
  const date = formatThaiDate(appointment.startsAt);
  const time = formatBangkokTime(appointment.startsAt);
  const headline = HEADLINE[type] ?? 'คุณมีนัดกับเรา';

  return {
    type: 'flex',
    altText: `${headline} ${date} เวลา ${time} น. — กดยืนยันหรือขอเลื่อนนัดได้ในแชท`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: BRAND.navyDeep,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: BRAND_INFO.name,
            color: BRAND.gold,
            size: 'sm',
            weight: 'bold',
          },
          {
            type: 'text',
            text: headline,
            color: BRAND.goldBright,
            size: 'lg',
            weight: 'bold',
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: BRAND.navy,
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: `คุณ${appointment.customerName}`,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              detailRow('วันที่', date),
              detailRow('เวลา', `${time} น.`),
              detailRow('บริการ', appointment.serviceName),
              detailRow('ผู้ให้บริการ', appointment.providerName),
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: BRAND.navy,
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: STATUS_COLOR.CONFIRMED,
            action: {
              type: 'postback',
              label: '✅ ยืนยันนัด',
              data: encodePostback({
                action: PostbackAction.CONFIRM,
                appointmentId: appointment.appointmentId,
              }),
              // ให้ข้อความที่ลูกค้ากดโผล่ในแชทเหมือนเขาพิมพ์เอง จะได้เห็นว่าตัวเองกดอะไรไป
              displayText: 'ยืนยันนัดครับ/ค่ะ',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '🔄 ขอเลื่อนนัด',
              data: encodePostback({
                action: PostbackAction.RESCHEDULE,
                appointmentId: appointment.appointmentId,
              }),
              displayText: 'ขอเลื่อนนัดครับ/ค่ะ',
            },
          },
        ],
      },
      styles: {
        header: { backgroundColor: BRAND.navyDeep },
        body: { backgroundColor: BRAND.navy },
        footer: { backgroundColor: BRAND.navy },
      },
    },
  };
}

/** หนึ่งบรรทัดของรายละเอียดนัด — หัวข้อสีทองจาง ค่าจริงสีขาว */
function detailRow(label: string, value: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: BRAND.gold, size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#FFFFFF', size: 'sm', flex: 5, wrap: true },
    ],
  };
}
