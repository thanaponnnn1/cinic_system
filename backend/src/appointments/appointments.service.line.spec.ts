import { Test, type TestingModule } from '@nestjs/testing';
import { ApptStatus } from '@clinicq/shared';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * เส้นทางที่ลูกค้ากดปุ่มเองในแชท LINE
 *
 * ต่างจาก endpoint ฝั่งพนักงานตรงที่ห้ามโยน error ออกไป — ปลายทางคือข้อความในแชท
 * ที่ต้องอ่านรู้เรื่อง ไม่ใช่หน้าจอ error ของ dashboard
 */
describe('AppointmentsService — ปุ่มใน LINE', () => {
  let service: AppointmentsService;

  const appointment = {
    id: 'appt_1',
    status: ApptStatus.BOOKED,
    startsAt: new Date('2026-09-02T03:30:00.000Z'),
    customer: { id: 'cus_1', name: 'สมหญิง ใจดี', lineUserId: 'Uline1' },
    provider: { name: 'คุณแอน' },
    service: { name: 'ทรีตเมนต์ผิวหน้า' },
  };

  const appointmentDb = { findUnique: jest.fn(), updateMany: jest.fn() };

  beforeEach(async () => {
    Object.values(appointmentDb).forEach((fn) => fn.mockReset());
    appointmentDb.findUnique.mockResolvedValue(appointment);
    appointmentDb.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: { appointment: appointmentDb } },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  describe('กดยืนยันนัด', () => {
    it('เปลี่ยนสถานะเป็น CONFIRMED เฉพาะตอนสถานะเดิมยังไม่ถูกใครแก้ — กันกดพร้อมกันสองเครื่อง', async () => {
      const result = await service.confirmFromLine('appt_1', 'Uline1');

      expect(result.status).toBe('ok');
      expect(appointmentDb.updateMany).toHaveBeenCalledWith({
        where: { id: 'appt_1', status: ApptStatus.BOOKED },
        data: { status: ApptStatus.CONFIRMED },
      });
    });

    it('คืนข้อมูลนัดไว้ประกอบข้อความตอบกลับ', async () => {
      const result = await service.confirmFromLine('appt_1', 'Uline1');

      expect(result).toMatchObject({
        status: 'ok',
        appointment: { startsAt: appointment.startsAt, providerName: 'คุณแอน' },
      });
    });

    it('กดปุ่มเดิมซ้ำ ต้องบอกสถานะปัจจุบันแทนการ error และไม่เขียนทับ', async () => {
      appointmentDb.findUnique.mockResolvedValue({ ...appointment, status: ApptStatus.CONFIRMED });

      const result = await service.confirmFromLine('appt_1', 'Uline1');

      expect(result).toEqual({ status: 'unchanged', current: ApptStatus.CONFIRMED });
      expect(appointmentDb.updateMany).not.toHaveBeenCalled();
    });

    it('ปฏิเสธเมื่อบัญชี LINE ที่กดไม่ใช่เจ้าของนัด — appointmentId เดาได้ ต้องกันไว้', async () => {
      const result = await service.confirmFromLine('appt_1', 'Uline-คนอื่น');

      expect(result).toEqual({ status: 'forbidden' });
      expect(appointmentDb.updateMany).not.toHaveBeenCalled();
    });

    it('บอกว่าเปลี่ยนไม่ได้เมื่อนัดถูกยกเลิกไปแล้ว', async () => {
      appointmentDb.findUnique.mockResolvedValue({ ...appointment, status: ApptStatus.CANCELLED });

      const result = await service.confirmFromLine('appt_1', 'Uline1');

      expect(result).toEqual({ status: 'invalid', current: ApptStatus.CANCELLED });
      expect(appointmentDb.updateMany).not.toHaveBeenCalled();
    });

    it('ตอบว่าไม่พบนัดเมื่อนัดถูกลบไปแล้ว', async () => {
      appointmentDb.findUnique.mockResolvedValue(null);

      expect(await service.confirmFromLine('ไม่มีจริง', 'Uline1')).toEqual({ status: 'not_found' });
    });

    it('ถือว่าไม่เปลี่ยนอะไร เมื่อมีคนแก้สถานะแทรกกลางคัน', async () => {
      appointmentDb.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.confirmFromLine('appt_1', 'Uline1');

      expect(result.status).toBe('unchanged');
    });
  });

  describe('กดขอเลื่อนนัด', () => {
    it('เปลี่ยนสถานะเป็น RESCHEDULE_REQUESTED เพื่อให้พนักงานเห็นว่าต้องโทรกลับ', async () => {
      const result = await service.requestRescheduleFromLine('appt_1', 'Uline1');

      expect(result.status).toBe('ok');
      expect(appointmentDb.updateMany).toHaveBeenCalledWith({
        where: { id: 'appt_1', status: ApptStatus.BOOKED },
        data: { status: ApptStatus.RESCHEDULE_REQUESTED },
      });
    });

    it('ขอเลื่อนซ้ำ ตอบสถานะปัจจุบันแทนการ error', async () => {
      appointmentDb.findUnique.mockResolvedValue({
        ...appointment,
        status: ApptStatus.RESCHEDULE_REQUESTED,
      });

      const result = await service.requestRescheduleFromLine('appt_1', 'Uline1');

      expect(result).toEqual({ status: 'unchanged', current: ApptStatus.RESCHEDULE_REQUESTED });
      expect(appointmentDb.updateMany).not.toHaveBeenCalled();
    });

    it('นัดที่ยืนยันแล้วขอเลื่อนเองในแชทไม่ได้ ต้องให้พนักงานจัดการ (กฎเดียวกับ state machine ของ Phase 2)', async () => {
      appointmentDb.findUnique.mockResolvedValue({ ...appointment, status: ApptStatus.CONFIRMED });

      const result = await service.requestRescheduleFromLine('appt_1', 'Uline1');

      expect(result).toEqual({ status: 'invalid', current: ApptStatus.CONFIRMED });
      expect(appointmentDb.updateMany).not.toHaveBeenCalled();
    });
  });
});
