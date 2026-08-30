import { formatThaiDate } from '../common/bangkok-time';

/** ตัวเลขของวันหนึ่งที่เจ้าของร้านอยากรู้ตอนปิดร้าน */
export interface DailyDigest {
  date: Date;
  revenue: number;
  completed: number;
  noShow: number;
  cancelled: number;
  byProvider: { name: string; completed: number; revenue: number }[];
  tomorrowCount: number;
}

/** 6800 → '6,800' */
function money(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * ข้อความสรุปปิดร้านที่ส่งเข้า LINE ของเจ้าของร้านทุกค่ำ
 *
 * มีแต่ตัวเลขรวม ไม่มีชื่อลูกค้าและไม่มีรายละเอียดการรักษา — ข้อความนี้ออกไปนอกระบบ
 * และเห็นได้จากหน้าจอล็อกของเครื่องเจ้าของร้าน จึงต้องสะอาดตั้งแต่ต้นทาง (PDPA)
 */
export function formatDailyDigest(digest: DailyDigest): string {
  const lines = [
    `📊 สรุปปิดร้าน ${formatThaiDate(digest.date)}`,
    '',
    `รายได้วันนี้ ${money(digest.revenue)} บาท`,
  ];

  if (digest.completed === 0) {
    lines.push('วันนี้ไม่มีเคสที่ปิดงาน');
  } else {
    lines.push(`รับบริการแล้ว ${digest.completed} เคส`);
  }

  lines.push(`ไม่มาตามนัด ${digest.noShow} · ยกเลิก ${digest.cancelled}`);

  if (digest.byProvider.length > 0) {
    lines.push('', '— แยกตามผู้ให้บริการ —');
    for (const provider of digest.byProvider) {
      lines.push(`${provider.name} ${provider.completed} เคส ${money(provider.revenue)} บาท`);
    }
  }

  lines.push('', `พรุ่งนี้มีนัด ${digest.tomorrowCount} คิว`);

  return lines.join('\n');
}
