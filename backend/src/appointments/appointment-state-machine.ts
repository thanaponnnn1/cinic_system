import { BadRequestException } from '@nestjs/common';
import { APPT_STATUS_LABEL, ApptStatus } from '@clinicq/shared';
import { ApiErrorCode } from '@clinicq/shared';

/**
 * สถานะนัดที่อนุญาตให้เปลี่ยนไปได้จากแต่ละสถานะ
 *
 * ตารางนี้คือแหล่งความจริงแหล่งเดียวของกฎการเปลี่ยนสถานะ — ทุก endpoint
 * ที่แตะสถานะนัดต้องเรียกผ่าน assertTransition() ไม่มีใครเขียน status ตรง ๆ
 *
 * เหตุผลที่ต้องคุมเข้ม: การเปลี่ยนสถานะแต่ละครั้งมีผลพ่วงเสมอ — ยกเลิกแล้วต้องปล่อยคิว
 * ให้คนที่รออยู่ (Phase 5) เสร็จบริการแล้วต้องตัดครั้งคอร์สและอัปเดตวันที่มาล่าสุด
 * ถ้าปล่อยให้เปลี่ยนสถานะข้ามขั้นได้ ผลพ่วงเหล่านั้นจะทำงานผิดจังหวะหรือทำซ้ำ
 */
const ALLOWED: Record<ApptStatus, readonly ApptStatus[]> = {
  [ApptStatus.BOOKED]: [
    ApptStatus.CONFIRMED,
    ApptStatus.RESCHEDULE_REQUESTED,
    ApptStatus.CANCELLED,
    ApptStatus.NO_SHOW,
    ApptStatus.COMPLETED,
  ],
  [ApptStatus.CONFIRMED]: [ApptStatus.CANCELLED, ApptStatus.NO_SHOW, ApptStatus.COMPLETED],
  // ขอเลื่อนแล้วกลับไปเป็น BOOKED ได้ เพราะการนัดเวลาใหม่คือการจองรอบใหม่
  [ApptStatus.RESCHEDULE_REQUESTED]: [ApptStatus.BOOKED, ApptStatus.CANCELLED],
  // สามสถานะนี้เป็นปลายทาง แก้ไม่ได้แล้ว — ถ้าคีย์ผิดต้องสร้างนัดใหม่ ไม่ใช่ย้อนสถานะ
  [ApptStatus.CANCELLED]: [],
  [ApptStatus.NO_SHOW]: [],
  [ApptStatus.COMPLETED]: [],
};

/** สถานะที่ถือว่านัดยังมีผลอยู่ — ใช้ตอนหานัดชนกันและตอนนับคิวของวัน */
export const ACTIVE_STATUSES: readonly ApptStatus[] = [ApptStatus.BOOKED, ApptStatus.CONFIRMED];

export function canTransition(from: ApptStatus, to: ApptStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** สถานะปลายทางที่เปลี่ยนต่อไม่ได้แล้ว */
export function isFinal(status: ApptStatus): boolean {
  return ALLOWED[status].length === 0;
}

/**
 * ตรวจว่าเปลี่ยนสถานะได้ไหม ถ้าไม่ได้ให้โยน error ที่บอกเหตุผลเป็นภาษาที่พนักงานอ่านรู้เรื่อง
 */
export function assertTransition(from: ApptStatus, to: ApptStatus): void {
  if (from === to) {
    throw new BadRequestException({
      error: ApiErrorCode.INVALID_TRANSITION,
      message: `นัดนี้อยู่ในสถานะ "${APPT_STATUS_LABEL[to]}" อยู่แล้ว`,
    });
  }

  if (canTransition(from, to)) return;

  const reason = isFinal(from)
    ? `นัดที่${APPT_STATUS_LABEL[from]}แล้วแก้ไขไม่ได้ ถ้าต้องการนัดใหม่ให้สร้างนัดใหม่แทน`
    : `เปลี่ยนจาก "${APPT_STATUS_LABEL[from]}" เป็น "${APPT_STATUS_LABEL[to]}" ไม่ได้`;

  throw new BadRequestException({
    error: ApiErrorCode.INVALID_TRANSITION,
    message: reason,
  });
}
