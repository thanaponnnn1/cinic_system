/**
 * หน่วงเวลาแบบ await ได้
 *
 * แยกออกมาเป็นไฟล์เดียวเพื่อให้เทสต์ของงานที่ต้องหน่วงจังหวะการส่ง (แคมเปญดึงลูกค้ากลับ)
 * mock ตัวนี้ตัวเดียวจบ ไม่ต้องรอเวลาจริงหลายวินาทีต่อการรันเทสต์หนึ่งครั้ง
 */
export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve) => setTimeout(resolve, ms));
}
