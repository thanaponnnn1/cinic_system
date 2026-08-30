import { WaitlistQueueService } from './waitlist-queue.service';
import { OFFER_TTL_MS } from './waitlist-engine.service';

const SLOT = {
  providerId: 'prov_1',
  serviceId: 'svc_1',
  slotStart: new Date('2026-09-02T03:30:00.000Z'),
  slotEnd: new Date('2026-09-02T04:00:00.000Z'),
};

describe('WaitlistQueueService', () => {
  const queue = { add: jest.fn() };

  function build(): WaitlistQueueService {
    return new WaitlistQueueService(queue as never);
  }

  beforeEach(() => queue.add.mockReset().mockResolvedValue({ id: 'job' }));

  it('ส่งคิวที่เพิ่งว่างเข้าคิวงานทันที — ยิ่งเสนอเร็ว โอกาสมีคนรับยิ่งสูง', async () => {
    await build().publishOpenSlot(SLOT);

    const [name, data] = queue.add.mock.calls[0];
    expect(name).toBe('waitlist-match');
    expect(data).toEqual({
      providerId: 'prov_1',
      serviceId: 'svc_1',
      slotStart: SLOT.slotStart.toISOString(),
      slotEnd: SLOT.slotEnd.toISOString(),
    });
  });

  it('ตั้งงานปิดข้อเสนอไว้ล่วงหน้าตามอายุของข้อเสนอ', async () => {
    await build().publishOpenSlot(SLOT);

    const expireJob = queue.add.mock.calls.find((call) => call[0] === 'waitlist-expire');
    expect(expireJob[2].delay).toBe(OFFER_TTL_MS);
  });

  it('งานปิดข้อเสนอใช้ jobId ที่ผูกกับคิวนั้น — ยกเลิกซ้ำหลายรอบก็ไม่มีงานซ้อน', async () => {
    await build().publishOpenSlot(SLOT);

    const expireJob = queue.add.mock.calls.find((call) => call[0] === 'waitlist-expire');
    expect(expireJob[2].jobId).toBe('waitlist-expire-prov_1-2026-09-02T033000.000Z');
    expect(expireJob[2].jobId).not.toContain(':');
  });

  it('คิวงานล่มต้องไม่ทำให้การยกเลิกนัดล้มตาม — นัดสำคัญกว่าการเสนอคิวว่าง', async () => {
    queue.add.mockRejectedValue(new Error('Redis ล่ม'));

    await expect(build().publishOpenSlot(SLOT)).resolves.not.toThrow();
  });
});
