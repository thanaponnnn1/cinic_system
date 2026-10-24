/**
 * (7) ตัวอักษรหมุนเปลี่ยนเมื่อเอาเมาส์ชี้แถวที่มี class roll-row: ทุกตัวมีสำเนาซ้อนอยู่ข้างล่าง
 * แล้วเลื่อนขึ้นทีละตัวไล่กัน (transition-delay ตามลำดับ) CSS ล้วน
 * ใช้กับชื่อภาษาอังกฤษตัวใหญ่ เพราะสระบนล่างของภาษาไทยจะโดนตัดเมื่อซ่อนด้วย overflow
 * screen reader อ่านข้อความเต็มจาก sr-only ไม่อ่านทีละตัวอักษร
 */
export function LetterRoll({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((letter, index) => (
        <span
          key={index}
          aria-hidden
          className="roll-letter relative"
          style={{ '--i': index } as React.CSSProperties}
        >
          <span>{letter}</span>
          <span className="top-full left-0 text-gold-600">{letter}</span>
        </span>
      ))}
    </span>
  );
}
