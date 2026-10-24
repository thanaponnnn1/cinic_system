import { formatBangkokDate, formatBangkokTime } from '@clinicq/shared';

/**
 * ไฟล์ปฏิทิน (.ics) ของนัดหนึ่งใบ สร้างในเครื่องลูกค้า ไม่ต้องมี endpoint เพิ่ม
 *
 * เขียนเวลาแบบ TZID=Asia/Bangkok พร้อม VTIMEZONE แทนเวลา UTC — ลูกค้าที่ตั้งเขตเวลาในมือถือ
 * ผิดยังเห็นเวลานัดตรงกับที่ร้านนัดไว้ และปฏิทินบางตัวแสดงชื่อเขตเวลาให้ด้วย
 */
export interface IcsEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  createdAt: Date;
}

/** '2026-10-25T03:00:00.000Z' → '20261025T100000' ตามเวลาไทย */
function bangkokStamp(iso: string): string {
  const date = new Date(iso);
  return `${formatBangkokDate(date).replaceAll('-', '')}T${formatBangkokTime(date).replace(':', '')}00`;
}

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** RFC 5545 ต้อง escape \ ; , และขึ้นบรรทัดใหม่ ไม่งั้นปฏิทินบางตัวตัดข้อความทิ้งกลางคำ */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//THNP ClinicQ//Customer Portal//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Bangkok',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0700',
    'TZOFFSETTO:+0700',
    'TZNAME:ICT',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.createdAt)}`,
    `DTSTART;TZID=Asia/Bangkok:${bangkokStamp(event.startsAt)}`,
    `DTEND;TZID=Asia/Bangkok:${bangkokStamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // RFC 5545 กำหนดให้ขึ้นบรรทัดด้วย CRLF
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

const encoder = new TextEncoder();

/**
 * บรรทัดยาวเกิน 75 ไบต์ต้องพับเป็นหลายบรรทัด — อักษรไทยหนึ่งตัวกิน 3 ไบต์ ชื่อบริการยาว ๆ
 * เกินได้ง่าย และต้องพับระหว่างตัวอักษร ไม่ใช่กลางไบต์ของตัวอักษรเดียว
 */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);

  return parts.join('\r\n ');
}
