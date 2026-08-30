import { BadRequestException } from '@nestjs/common';
import { ApptStatus } from '@clinicq/shared';
import { assertTransition, canTransition, isFinal } from './appointment-state-machine';

const ALL = Object.values(ApptStatus);

/**
 * ตารางความจริงของการเปลี่ยนสถานะนัด
 *
 * เขียนเป็นตารางที่ครอบ "ทุกคู่" ที่เป็นไปได้ (6 × 6 = 36 คู่) แทนการเลือกทดสอบบางคู่
 * เพราะถ้าใครไปแก้ ALLOWED โดยไม่ตั้งใจ เทสต์จะจับได้ทุกช่อง ไม่ใช่เฉพาะช่องที่เคยนึกถึง
 */
const EXPECTED: Record<ApptStatus, ApptStatus[]> = {
  [ApptStatus.BOOKED]: [
    ApptStatus.CONFIRMED,
    ApptStatus.RESCHEDULE_REQUESTED,
    ApptStatus.CANCELLED,
    ApptStatus.NO_SHOW,
    ApptStatus.COMPLETED,
  ],
  [ApptStatus.CONFIRMED]: [ApptStatus.CANCELLED, ApptStatus.NO_SHOW, ApptStatus.COMPLETED],
  [ApptStatus.RESCHEDULE_REQUESTED]: [ApptStatus.BOOKED, ApptStatus.CANCELLED],
  [ApptStatus.CANCELLED]: [],
  [ApptStatus.NO_SHOW]: [],
  [ApptStatus.COMPLETED]: [],
};

describe('AppointmentStateMachine', () => {
  describe('ตารางการเปลี่ยนสถานะครบทุกคู่', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const allowed = EXPECTED[from].includes(to);
        const label = `${from} -> ${to} ${allowed ? 'ได้' : 'ไม่ได้'}`;

        it(label, () => {
          expect(canTransition(from, to)).toBe(allowed);
        });
      }
    }
  });

  describe('สถานะปลายทาง', () => {
    it.each([ApptStatus.CANCELLED, ApptStatus.NO_SHOW, ApptStatus.COMPLETED])(
      '%s เปลี่ยนต่อไม่ได้แล้ว',
      (status) => {
        expect(isFinal(status)).toBe(true);
      },
    );

    it.each([ApptStatus.BOOKED, ApptStatus.CONFIRMED, ApptStatus.RESCHEDULE_REQUESTED])(
      '%s ยังเปลี่ยนต่อได้',
      (status) => {
        expect(isFinal(status)).toBe(false);
      },
    );
  });

  describe('assertTransition', () => {
    it('ผ่านเงียบ ๆ เมื่อเปลี่ยนได้', () => {
      expect(() => assertTransition(ApptStatus.BOOKED, ApptStatus.CONFIRMED)).not.toThrow();
    });

    it('บอกว่าอยู่สถานะนั้นอยู่แล้วเมื่อกดซ้ำ', () => {
      // เคสจริง: พนักงานกดยืนยันสองครั้ง หรือลูกค้ากดปุ่มใน LINE ซ้ำ (Phase 3)
      // ต้องได้ข้อความที่เข้าใจได้ ไม่ใช่ error ที่ดูเหมือนระบบพัง
      expect(() => assertTransition(ApptStatus.CONFIRMED, ApptStatus.CONFIRMED)).toThrow(
        /อยู่แล้ว/,
      );
    });

    it('แนะให้สร้างนัดใหม่เมื่อนัดจบไปแล้ว', () => {
      expect(() => assertTransition(ApptStatus.COMPLETED, ApptStatus.CONFIRMED)).toThrow(
        /สร้างนัดใหม่/,
      );
    });

    it('บอกทั้งสถานะต้นทางและปลายทางเมื่อข้ามขั้น', () => {
      expect(() => assertTransition(ApptStatus.CONFIRMED, ApptStatus.RESCHEDULE_REQUESTED)).toThrow(
        BadRequestException,
      );
    });

    it('ติดรหัส INVALID_TRANSITION ให้ผู้เรียก API แยกเคสนี้ออกจาก validation ทั่วไปได้', () => {
      try {
        assertTransition(ApptStatus.CANCELLED, ApptStatus.COMPLETED);
        throw new Error('ควรโยน error');
      } catch (error) {
        const body = (error as BadRequestException).getResponse() as { error: string };
        expect(body.error).toBe('INVALID_TRANSITION');
      }
    });
  });

  describe('กฎที่ธุรกิจต้องการ', () => {
    it('นัดที่ยืนยันแล้วยังบันทึกว่าไม่มาได้ — ยืนยันไม่ได้แปลว่ามาแน่', () => {
      expect(canTransition(ApptStatus.CONFIRMED, ApptStatus.NO_SHOW)).toBe(true);
    });

    it('นัดที่ขอเลื่อนกลับมาเป็นรอจองใหม่ได้ เพราะการนัดเวลาใหม่คือการจองรอบใหม่', () => {
      expect(canTransition(ApptStatus.RESCHEDULE_REQUESTED, ApptStatus.BOOKED)).toBe(true);
    });

    it('นัดที่ยืนยันแล้วขอเลื่อนตรง ๆ ไม่ได้ ต้องยกเลิกแล้วจองใหม่', () => {
      expect(canTransition(ApptStatus.CONFIRMED, ApptStatus.RESCHEDULE_REQUESTED)).toBe(false);
    });

    it('ไม่มามาแล้วเปลี่ยนเป็นรับบริการแล้วไม่ได้ — ต้องแก้ที่ต้นทางแทน', () => {
      expect(canTransition(ApptStatus.NO_SHOW, ApptStatus.COMPLETED)).toBe(false);
    });
  });
});
