export const DECK_VISIBLE = 3;

/** ท่าของการ์ดตามลำดับในกอง ใช้ร่วมกันทั้งกองนิ่งและกองที่ปัดได้ ภาพจึงไม่กระตุกตอนสลับ */
export function deckPose(depth: number) {
  return {
    y: depth * 16,
    scale: 1 - depth * 0.045,
    opacity: depth >= DECK_VISIBLE ? 0 : 1 - depth * 0.22,
  };
}
