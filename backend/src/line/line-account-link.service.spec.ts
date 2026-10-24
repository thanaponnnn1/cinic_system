import { LineAccountLinkService } from './line-account-link.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * กฎการผูกบัญชีที่ทั้งแชทและหน้าเว็บลูกค้าใช้ร่วมกัน
 *
 * เทสต์ฝั่งแชทยืนยันคำตอบในแชทอยู่แล้ว ที่นี่ยืนยันผลที่หน้าเว็บจะเอาไปแปลเป็นรหัส HTTP
 */
describe('LineAccountLinkService', () => {
  const customerDb = { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  const service = new LineAccountLinkService({
    customer: customerDb,
  } as unknown as PrismaService);

  beforeEach(() => {
    Object.values(customerDb).forEach((fn) => fn.mockReset());
    customerDb.findFirst.mockResolvedValue({ id: 'cus_1', name: 'สมหญิง ใจดี' });
    customerDb.findUnique.mockResolvedValue(null);
    customerDb.update.mockResolvedValue({});
  });

  it('ผูกสำเร็จแล้วคืนลูกค้าที่ถูกผูก พร้อมล้างรหัสทิ้ง', async () => {
    await expect(service.link('482913', 'Uline1')).resolves.toEqual({
      status: 'linked',
      customer: { id: 'cus_1', name: 'สมหญิง ใจดี' },
    });
    expect(customerDb.update).toHaveBeenCalledWith({
      where: { id: 'cus_1' },
      data: { lineUserId: 'Uline1', linkCode: null },
    });
  });

  it('ผูกซ้ำกับลูกค้าคนเดิมได้ — ลูกค้ากดผูกซ้ำต้องไม่เจอ error', async () => {
    customerDb.findUnique.mockResolvedValue({ id: 'cus_1' });

    await expect(service.link('482913', 'Uline1')).resolves.toMatchObject({ status: 'linked' });
  });

  it('รหัสที่ไม่มีหรือใช้ไปแล้ว ไม่แตะข้อมูลใคร', async () => {
    customerDb.findFirst.mockResolvedValue(null);

    await expect(service.link('111111', 'Uline1')).resolves.toEqual({ status: 'code_not_found' });
    expect(customerDb.update).not.toHaveBeenCalled();
  });

  it('บัญชี LINE ที่ผูกกับลูกค้าคนอื่นอยู่แล้ว ไม่ถูกย้ายมาผูกกับคนใหม่', async () => {
    customerDb.findUnique.mockResolvedValue({ id: 'cus_other' });

    await expect(service.link('482913', 'Uline1')).resolves.toEqual({
      status: 'line_already_linked_to_other',
    });
    expect(customerDb.update).not.toHaveBeenCalled();
  });

  it('สองคำขอชนกันตอนเขียนจนติด unique ของ lineUserId ตอบว่าผูกกับคนอื่นแล้ว ไม่ใช่ 500', async () => {
    customerDb.update.mockRejectedValue({ code: 'P2002' });

    await expect(service.link('482913', 'Uline1')).resolves.toEqual({
      status: 'line_already_linked_to_other',
    });
  });

  it('error อื่นจากฐานข้อมูลไม่ถูกกลืน', async () => {
    customerDb.update.mockRejectedValue(new Error('DB ล่ม'));

    await expect(service.link('482913', 'Uline1')).rejects.toThrow('DB ล่ม');
  });
});
