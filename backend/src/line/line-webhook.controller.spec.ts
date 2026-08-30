import { LineWebhookController } from './line-webhook.controller';
import type { LineWebhookService } from './line-webhook.service';
import type { LineWebhookEvent } from './line-webhook.types';

describe('LineWebhookController', () => {
  const events = [{ type: 'message' }] as LineWebhookEvent[];

  function controllerWith(handleEvents: jest.Mock): LineWebhookController {
    return new LineWebhookController({ handleEvents } as unknown as LineWebhookService);
  }

  it('ส่งอีเวนต์ทั้งชุดต่อให้ service ประมวลผล', async () => {
    const handleEvents = jest.fn().mockResolvedValue(undefined);

    await controllerWith(handleEvents).receive({ events });

    expect(handleEvents).toHaveBeenCalledWith(events);
  });

  it('รับ body ที่ไม่มี events ได้ — LINE ยิงมาแบบนี้ตอนกดปุ่ม Verify', async () => {
    const handleEvents = jest.fn().mockResolvedValue(undefined);

    await expect(controllerWith(handleEvents).receive({})).resolves.toEqual({ ok: true });

    expect(handleEvents).toHaveBeenCalledWith([]);
  });

  it('ตอบ 200 แม้ประมวลผลอีเวนต์ล้มเหลว ไม่งั้น LINE จะยิงซ้ำและงานจะทำสองรอบ', async () => {
    const handleEvents = jest.fn().mockRejectedValue(new Error('DB ล่ม'));

    await expect(controllerWith(handleEvents).receive({ events })).resolves.toEqual({ ok: true });
  });
});
