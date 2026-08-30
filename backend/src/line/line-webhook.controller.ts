import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { LineSignatureGuard } from './line-signature.guard';
import { LineWebhookService } from './line-webhook.service';
import type { LineWebhookBody } from './line-webhook.types';

/**
 * ปลายทางที่ LINE ยิงอีเวนต์เข้ามา
 *
 * เปิดสาธารณะโดยตั้งใจ (ไม่มี JWT) — ตัวที่พิสูจน์ตัวตนคือลายเซ็นใน LineSignatureGuard
 *
 * ต้องตอบ 200 เสมอและตอบเร็ว: LINE ถือว่า response ที่ไม่ใช่ 2xx คือส่งไม่สำเร็จ
 * แล้วยิงซ้ำ ซึ่งจะกลายเป็นการยืนยันนัดซ้ำหรือส่งข้อความซ้ำให้ลูกค้า
 */
@ApiExcludeController()
@Controller('webhooks/line')
export class LineWebhookController {
  private readonly logger = new Logger(LineWebhookController.name);

  constructor(private readonly webhook: LineWebhookService) {}

  @Post()
  @Public()
  @UseGuards(LineSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async receive(@Body() body: LineWebhookBody): Promise<{ ok: true }> {
    try {
      await this.webhook.handleEvents(body.events ?? []);
    } catch (error) {
      this.logger.error(
        `ประมวลผล webhook ไม่สำเร็จ: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { ok: true };
  }
}
