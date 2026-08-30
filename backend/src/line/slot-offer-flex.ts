import type { messagingApi } from '@line/bot-sdk';
import { BRAND, BRAND_INFO, STATUS_COLOR } from '@clinicq/shared';
import { formatBangkokTime, formatThaiDate } from '../common/bangkok-time';
import { PostbackAction, encodePostback } from './postback-data';

export interface SlotOfferFlexInput {
  waitlistEntryId: string;
  customerName: string;
  serviceName: string;
  providerName: string;
  slotStart: Date;
  /** กดรับได้ถึงเมื่อไหร่ */
  expiresAt: Date;
}

/**
 * ข้อความ "มีคิวว่าง" ที่ยิงหาทุกคนในคิวรอที่ช่วงเวลาตรงกัน
 *
 * ต้องอ่านจบใน 2 วินาที เพราะคนที่กดก่อนได้คิว — เวลาตัวใหญ่ ปุ่มเดียว เส้นตายชัด
 * ไม่ใส่ปุ่มปฏิเสธเพราะไม่กดก็หมดเวลาไปเอง และปุ่มที่มากขึ้นทำให้ตัดสินใจช้าลง
 */
export function buildSlotOfferFlex(offer: SlotOfferFlexInput): messagingApi.FlexMessage {
  const date = formatThaiDate(offer.slotStart);
  const time = formatBangkokTime(offer.slotStart);
  const deadline = formatBangkokTime(offer.expiresAt);

  return {
    type: 'flex',
    altText: `มีคิวว่าง ${date} ${time} น. — กดจองในแชทได้เลย (ภายใน ${deadline} น.)`,
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
            text: '🎉 มีคิวว่างสำหรับคุณ',
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
            text: `คุณ${offer.customerName}`,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold',
            wrap: true,
          },
          {
            type: 'text',
            text: `${time} น.`,
            color: BRAND.goldBright,
            size: 'xxl',
            weight: 'bold',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              detailRow('วันที่', date),
              detailRow('บริการ', offer.serviceName),
              detailRow('ผู้ให้บริการ', offer.providerName),
            ],
          },
          {
            type: 'text',
            text: `กดจองภายใน ${deadline} น. — ใครกดก่อนได้ก่อนครับ`,
            color: STATUS_COLOR.BOOKED,
            size: 'xs',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: BRAND.navy,
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: STATUS_COLOR.CONFIRMED,
            action: {
              type: 'postback',
              label: '⚡ จองคิวนี้',
              data: encodePostback({
                action: PostbackAction.CLAIM_SLOT,
                waitlistEntryId: offer.waitlistEntryId,
              }),
              displayText: 'ขอจองคิวนี้ครับ/ค่ะ',
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
