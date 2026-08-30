import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@clinicq/shared';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { FindCustomersQueryDto } from './dto/customer-request.dto';

describe('CustomersService', () => {
  let service: CustomersService;

  const customer = {
    id: 'cus_1',
    name: 'สมหญิง ใจดี',
    phone: '0812345678',
    lineUserId: null,
    consentReminder: false,
    consentMarketing: false,
    consentAt: null,
    lastVisitAt: null,
    note: null,
    isActive: true,
    createdAt: new Date('2026-01-01T03:00:00.000Z'),
  };

  const db = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    Object.values(db).forEach((fn) => fn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: { customer: db } }],
    }).compile();

    service = module.get(CustomersService);
  });

  describe('เพิ่มลูกค้า', () => {
    it('บันทึกเวลาที่ให้ความยินยอมเมื่อลูกค้ายินยอมตั้งแต่แรก', async () => {
      db.findUnique.mockResolvedValue(null);
      db.create.mockResolvedValue(customer);

      await service.create(
        { name: 'สมหญิง ใจดี', phone: '0812345678', consentReminder: true },
        Role.STAFF,
      );

      const data = db.create.mock.calls[0][0].data;
      expect(data.consentReminder).toBe(true);
      expect(data.consentAt).toBeInstanceOf(Date);
    });

    it('ไม่บันทึกเวลาให้ความยินยอมเมื่อลูกค้าไม่ได้ยินยอมอะไรเลย', async () => {
      db.findUnique.mockResolvedValue(null);
      db.create.mockResolvedValue(customer);

      await service.create({ name: 'สมหญิง ใจดี', phone: '0812345678' }, Role.STAFF);

      expect(db.create.mock.calls[0][0].data.consentAt).toBeNull();
    });

    it('ปฏิเสธเบอร์ซ้ำพร้อมบอกว่าเบอร์นี้เป็นของใคร', async () => {
      db.findUnique.mockResolvedValue({ ...customer, name: 'ปิยะดา วงศ์สว่าง' });

      await expect(
        service.create({ name: 'คนใหม่', phone: '0812345678' }, Role.STAFF),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('แก้ไขความยินยอม', () => {
    it('ทับเวลาที่ให้ความยินยอมใหม่ทุกครั้งที่ค่าเปลี่ยน', async () => {
      const before = new Date('2026-01-01T03:00:00.000Z');
      db.findUnique.mockResolvedValue({ ...customer, consentReminder: false, consentAt: before });
      db.update.mockResolvedValue(customer);

      await service.updateConsent('cus_1', { consentReminder: true }, Role.STAFF);

      const data = db.update.mock.calls[0][0].data;
      expect(data.consentReminder).toBe(true);
      expect(data.consentAt.getTime()).toBeGreaterThan(before.getTime());
    });

    it('ไม่ทับเวลาเดิมเมื่อส่งค่าเดิมกลับมา — ไม่งั้นประวัติความยินยอมจะเพี้ยน', async () => {
      db.findUnique.mockResolvedValue({ ...customer, consentReminder: true });
      db.update.mockResolvedValue(customer);

      await service.updateConsent('cus_1', { consentReminder: true }, Role.STAFF);

      expect(db.update.mock.calls[0][0].data).not.toHaveProperty('consentAt');
    });

    it('คงค่าเดิมของฟิลด์ที่ไม่ได้ส่งมา', async () => {
      db.findUnique.mockResolvedValue({
        ...customer,
        consentReminder: true,
        consentMarketing: true,
      });
      db.update.mockResolvedValue(customer);

      await service.updateConsent('cus_1', { consentMarketing: false }, Role.STAFF);

      const data = db.update.mock.calls[0][0].data;
      expect(data.consentReminder).toBe(true);
      expect(data.consentMarketing).toBe(false);
    });
  });

  describe('ค้นหาลูกค้าที่หายไป', () => {
    it('นับลูกค้าที่ยังไม่เคยมาเป็นกลุ่มที่หายไปด้วย', async () => {
      db.findMany.mockResolvedValue([]);
      db.count.mockResolvedValue(0);

      const query = new FindCustomersQueryDto();
      query.inactiveDays = 90;
      await service.findAll(query, Role.STAFF);

      const where = db.findMany.mock.calls[0][0].where;
      // ต้องครอบทั้งคนที่มานานแล้วและคนที่ไม่เคยมาเลย
      expect(where.OR).toEqual([{ lastVisitAt: { lt: expect.any(Date) } }, { lastVisitAt: null }]);
    });

    it('ซ่อนลูกค้าที่ปิดการใช้งานไว้เป็นค่าเริ่มต้น', async () => {
      db.findMany.mockResolvedValue([]);
      db.count.mockResolvedValue(0);

      await service.findAll(new FindCustomersQueryDto(), Role.STAFF);

      expect(db.findMany.mock.calls[0][0].where.isActive).toBe(true);
    });
  });

  describe('ปิดการใช้งาน', () => {
    it('ไม่ลบข้อมูลจริง เพราะประวัตินัดยังต้องอ้างถึงลูกค้ารายนี้ได้', async () => {
      db.findUnique.mockResolvedValue(customer);
      db.update.mockResolvedValue({ ...customer, isActive: false });

      await service.deactivate('cus_1');

      expect(db.update).toHaveBeenCalledWith({
        where: { id: 'cus_1' },
        data: { isActive: false },
      });
    });

    it('แจ้งชัดเจนเมื่อไม่พบลูกค้า', async () => {
      db.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('ไม่มีจริง')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ออกรหัสเชื่อมบัญชี LINE', () => {
    it('บันทึกรหัส 6 หลักลงกับลูกค้ารายนั้น เพื่อให้พนักงานอ่านให้ลูกค้าฟังได้', async () => {
      db.findUnique.mockResolvedValue(customer);
      db.findFirst.mockResolvedValue(null);
      db.update.mockResolvedValue({ ...customer, linkCode: '482913' });

      const result = await service.issueLinkCode('cus_1');

      expect(result.linkCode).toMatch(/^[1-9]\d{5}$/);
      expect(db.update).toHaveBeenCalledWith({
        where: { id: 'cus_1' },
        data: { linkCode: result.linkCode },
      });
    });

    it('เลี่ยงรหัสที่มีลูกค้าคนอื่นถืออยู่ ไม่งั้นพิมพ์รหัสแล้วผูกผิดคน', async () => {
      db.findUnique.mockResolvedValue(customer);
      db.findFirst.mockResolvedValueOnce({ id: 'cus_other' }).mockResolvedValueOnce(null);
      db.update.mockResolvedValue(customer);

      const result = await service.issueLinkCode('cus_1');

      expect(db.findFirst).toHaveBeenCalledTimes(2);
      expect(db.update).toHaveBeenCalledWith({
        where: { id: 'cus_1' },
        data: { linkCode: result.linkCode },
      });
    });

    it('แจ้งชัดเจนเมื่อไม่พบลูกค้า', async () => {
      db.findUnique.mockResolvedValue(null);

      await expect(service.issueLinkCode('ไม่มีจริง')).rejects.toThrow(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
