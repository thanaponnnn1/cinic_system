/**
 * (10) ชื่อร้านตัวใหญ่ล้นขอบล่างของส่วนท้ายเว็บ CSS ล้วน ไม่ใช้ WebGL
 * ขนาดผูกกับความกว้างจอ (vw) ตัวอักษรจึงกว้างเกือบเต็มจอทุกขนาด และส่วนล่างถูกตัดด้วย overflow
 * เนื้อทองโลหะเป็นไล่สีนิ่ง แถบแสงพาดผ่านทุก 12 วินาที (ลดการเคลื่อนไหว: ไม่มีแถบแสง)
 */
const TYPE =
  'translate-y-[16%] text-center font-display text-[29vw] leading-[0.82] font-medium tracking-[-0.02em] whitespace-nowrap';

export function WordmarkBleed({ text }: { text: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative overflow-hidden opacity-60 select-none"
    >
      <p className={`wordmark-metal ${TYPE}`}>{text}</p>
      <div className="wordmark-sheen opacity-70">
        <p className={TYPE}>{text}</p>
      </div>
    </div>
  );
}
