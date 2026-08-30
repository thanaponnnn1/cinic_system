import { ApptStatus, DeliveryStatus, MsgType, Role, WaitlistStatus } from '@clinicq/shared';
import {
  ApptStatus as PrismaApptStatus,
  DeliveryStatus as PrismaDeliveryStatus,
  MsgType as PrismaMsgType,
  Role as PrismaRole,
  WaitlistStatus as PrismaWaitlistStatus,
} from '../generated/prisma/enums';

/**
 * enum ถูกประกาศไว้สองที่: ใน schema.prisma (ฝั่งฐานข้อมูล) และใน shared/src/enums.ts
 * (ที่ frontend ใช้ได้ด้วย) — สองชุดนี้ต้องตรงกันเสมอ
 *
 * ถ้าใครเพิ่มสถานะใหม่ที่ฝั่งใดฝั่งหนึ่งแล้วลืมอีกฝั่ง เทสต์นี้จะแดงทันที
 * แทนที่จะไปพังตอน runtime ด้วยค่าที่ฐานข้อมูลไม่รู้จัก
 */
describe('enum ของ Prisma กับ shared ต้องตรงกัน', () => {
  it.each([
    ['Role', Role, PrismaRole],
    ['ApptStatus', ApptStatus, PrismaApptStatus],
    ['WaitlistStatus', WaitlistStatus, PrismaWaitlistStatus],
    ['MsgType', MsgType, PrismaMsgType],
    ['DeliveryStatus', DeliveryStatus, PrismaDeliveryStatus],
  ])('%s มีค่าเหมือนกันทั้งสองฝั่ง', (_name, sharedEnum, prismaEnum) => {
    const sharedValues = Object.values(sharedEnum).sort();
    const prismaValues = Object.values(prismaEnum).sort();

    expect(sharedValues).toEqual(prismaValues);
  });
});
