'use client';

import type { RevenuePoint } from '@/lib/api-types';
import { money } from '@/lib/format';

const THAI_DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

/**
 * รายได้ย้อนหลัง 7 วัน
 *
 * เลือกแท่งแนวตั้งเพราะสิ่งที่ถามคือ "ขนาด" ของแต่ละวันและเทียบกันเอง ไม่ใช่แนวโน้มต่อเนื่อง
 * ที่เส้นจะเล่าได้ดีกว่า — เจ็ดจุดน้อยเกินกว่าจะเป็นเส้นที่มีความหมาย
 *
 * ซีรีส์เดียวจึงไม่มีคำอธิบายสี (หัวข้อบอกอยู่แล้วว่าคืออะไร) ป้ายตัวเลขติดเฉพาะวันที่สูงสุด
 * และวันนี้ ที่เหลืออ่านได้จากการชี้ — ตัวเลขบนทุกแท่งทำให้กราฟกลายเป็นตารางที่อ่านยากกว่าเดิม
 */
export function RevenueBars({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((point) => point.revenue), 1);
  const peak = points.reduce(
    (best, point) => (point.revenue > best.revenue ? point : best),
    points[0],
  );

  return (
    <figure className="space-y-3">
      <div className="flex h-44 items-end gap-2">
        {points.map((point, index) => {
          const isToday = index === points.length - 1;
          const isPeak = point === peak && point.revenue > 0;
          const height = point.revenue === 0 ? 2 : Math.max(4, (point.revenue / max) * 100);

          return (
            <div
              key={point.date}
              className="group relative flex flex-1 flex-col items-center gap-1"
            >
              {(isPeak || isToday) && point.revenue > 0 && (
                <span className="text-[11px] text-gold-300/70">{money(point.revenue)}</span>
              )}

              <div className="flex w-full flex-1 items-end">
                <div
                  // ปลายแท่งมนเฉพาะด้านบน ฐานยังชนเส้นศูนย์เสมอ — แท่งที่ลอยจากฐานทำให้เทียบขนาดผิด
                  className={`w-full rounded-t transition ${
                    isToday ? 'bg-gold-400' : 'bg-gold-400/55'
                  } group-hover:bg-gold-300`}
                  style={{ height: `${height}%` }}
                  role="img"
                  aria-label={`${point.date} รายได้ ${money(point.revenue)} บาท จาก ${point.completed} เคส`}
                  tabIndex={0}
                />
              </div>

              <span className={`text-[11px] ${isToday ? 'text-gold-200' : 'text-gold-300/50'}`}>
                {THAI_DAY_SHORT[new Date(`${point.date}T00:00:00+07:00`).getUTCDay()]}
              </span>

              <div className="pointer-events-none absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-md border border-navy-600 bg-navy-950 px-2 py-1 text-center text-[11px] whitespace-nowrap text-gold-100 group-focus-within:block group-hover:block">
                <span className="block text-gold-300/60">{point.date}</span>
                {money(point.revenue)} บาท · {point.completed} เคส
              </div>
            </div>
          );
        })}
      </div>

      {/* ตารางสำหรับโปรแกรมอ่านหน้าจอ — กราฟไม่ใช่ทางเดียวที่จะเข้าถึงตัวเลขชุดนี้ */}
      <table className="sr-only">
        <caption>รายได้ย้อนหลัง 7 วัน</caption>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>รายได้ (บาท)</th>
            <th>เคสที่ปิดงาน</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.revenue}</td>
              <td>{point.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
