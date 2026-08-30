import type { messagingApi } from '@line/bot-sdk';
import { LineNotificationChannel } from './line-notification.channel';
import type { LineMessagingService } from '../line/line-messaging.service';

describe('LineNotificationChannel', () => {
  const push = jest.fn();
  const channel = new LineNotificationChannel({ push } as unknown as LineMessagingService);
  const flex = { type: 'flex', altText: 'เตือนนัด', contents: {} } as messagingApi.FlexMessage;

  beforeEach(() => push.mockReset());

  it('ส่ง Flex เมื่อมี เพราะปุ่มกดยืนยันอยู่ในนั้น', async () => {
    push.mockResolvedValue(true);

    await expect(channel.send('Uline1', { text: 'เตือนนัด', flex })).resolves.toBe(true);
    expect(push).toHaveBeenCalledWith('Uline1', [flex]);
  });

  it('ส่งข้อความธรรมดาเมื่อไม่มี Flex', async () => {
    push.mockResolvedValue(true);

    await channel.send('Uline1', { text: 'สรุปปิดร้านวันนี้' });

    expect(push).toHaveBeenCalledWith('Uline1', [{ type: 'text', text: 'สรุปปิดร้านวันนี้' }]);
  });

  it('คืน false เมื่อส่งไม่ออก เพื่อให้ผู้เรียกบันทึกเป็น FAILED', async () => {
    push.mockResolvedValue(false);

    await expect(channel.send('Uline1', { text: 'เตือนนัด', flex })).resolves.toBe(false);
  });
});
