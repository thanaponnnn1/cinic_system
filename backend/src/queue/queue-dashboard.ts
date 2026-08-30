import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import type { Queue } from 'bullmq';
import { REMINDERS_QUEUE_TOKEN } from './queue.tokens';

const DASHBOARD_PATH = '/admin/queues';

/**
 * หน้าจอดูคิวงาน — เห็นว่างานเตือนนัดใบไหนรอ ใบไหนล้ม และสั่งลองใหม่ได้
 *
 * ปิดไว้โดยปริยาย เปิดเมื่อตั้ง BULL_BOARD_USER/BULL_BOARD_PASSWORD เท่านั้น
 * เพราะหน้านี้สั่งลบและสั่งรันงานได้ทั้งคิว ปล่อยเปิดสาธารณะคือให้คนนอกยิงข้อความหาลูกค้าได้
 */
export function mountQueueDashboard(app: INestApplication, config: ConfigService): void {
  const logger = new Logger('QueueDashboard');
  const user = config.get<string>('BULL_BOARD_USER');
  const password = config.get<string>('BULL_BOARD_PASSWORD');

  if (!user || !password) {
    logger.log('ไม่ได้ตั้ง BULL_BOARD_USER/BULL_BOARD_PASSWORD — ไม่เปิดหน้าจอคิวงาน');
    return;
  }

  const queue = app.get<Queue>(REMINDERS_QUEUE_TOKEN);
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(DASHBOARD_PATH);

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
  });

  app.use(
    DASHBOARD_PATH,
    basicAuth({ users: { [user]: password }, challenge: true }),
    serverAdapter.getRouter(),
  );

  logger.log(`เปิดหน้าจอคิวงานที่ ${DASHBOARD_PATH}`);
}
