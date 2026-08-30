import { WaitlistController } from './waitlist.controller';
import type { WaitlistService } from './waitlist.service';
import { FindWaitlistQueryDto } from './dto/waitlist.dto';

describe('WaitlistController', () => {
  const waitlist = { findAll: jest.fn(), create: jest.fn(), cancel: jest.fn() };
  const controller = new WaitlistController(waitlist as unknown as WaitlistService);

  const dto = {
    customerId: 'cus_1',
    serviceId: 'svc_1',
    windowStart: '2026-09-02T09:00:00+07:00',
    windowEnd: '2026-09-02T17:00:00+07:00',
  };

  beforeEach(() => {
    Object.values(waitlist).forEach((fn) => fn.mockReset().mockResolvedValue(undefined));
  });

  it('ส่งเงื่อนไขการค้นหาต่อให้ service ตรง ๆ', async () => {
    const query = new FindWaitlistQueryDto();

    await controller.findAll(query);

    expect(waitlist.findAll).toHaveBeenCalledWith(query);
  });

  it('เพิ่มลูกค้าเข้าคิวรอ', async () => {
    await controller.create(dto);

    expect(waitlist.create).toHaveBeenCalledWith(dto);
  });

  it('ถอนชื่อออกจากคิวรอ', async () => {
    await controller.cancel('wl_1');

    expect(waitlist.cancel).toHaveBeenCalledWith('wl_1');
  });
});
