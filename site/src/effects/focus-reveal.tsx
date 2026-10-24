import { Fragment } from 'react';

/**
 * (1) คำโปรยค่อย ๆ ชัดทีละคำ CSS ล้วน ข้อความอยู่ใน HTML ตั้งแต่ byte แรก
 * แต่ละคำเริ่มที่ความทึบ 0.16 (ไม่ใช่ 0) เบราว์เซอร์จึงนับว่าวาดข้อความแล้วตั้งแต่เฟรมแรก
 * ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงรับคำที่ตัดมาแล้วเป็น array
 * wordClassName ใส่ที่ตัวคำเอง: ตัวอักษรไล่สี (background-clip: text) ต้องอยู่บน element ที่ขยับ
 * ถ้าใส่ที่ตัวแม่ คำที่เป็น inline-block และมี transform จะกลายเป็นตัวอักษรโปร่งใสมองไม่เห็น
 */
export function FocusReveal({
  words,
  offset = 0,
  wordClassName = '',
}: {
  words: readonly string[];
  offset?: number;
  wordClassName?: string;
}) {
  return words.map((word, index) => (
    <Fragment key={word}>
      <span
        className={`focus-word ${wordClassName}`}
        style={{ '--i': index + offset } as React.CSSProperties}
      >
        {word}
      </span>
      {index < words.length - 1 ? ' ' : null}
    </Fragment>
  ));
}
