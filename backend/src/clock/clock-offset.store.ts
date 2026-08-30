/**
 * ที่เก็บค่าที่บอกว่าเวลาของระบบถูกขยับไปข้างหน้ากี่มิลลิวินาที
 *
 * ต้องอยู่นอกโปรเซส เพราะ API กับ worker เป็นคนละโปรเซสกัน แต่ต้องเห็นเวลาเดียวกัน
 * ไม่งั้นกดข้ามเวลาแล้วงานเตือนนัดจะยังคิดว่ายังไม่ถึงเวลา
 */
export interface ClockOffsetStore {
  read(): Promise<number>;
  write(offsetMs: number): Promise<void>;
}

export const CLOCK_OFFSET_STORE = Symbol('CLOCK_OFFSET_STORE');

/** คีย์ที่ใช้เก็บใน Redis */
export const CLOCK_OFFSET_KEY = 'clinicq:demo:clock-offset-ms';
