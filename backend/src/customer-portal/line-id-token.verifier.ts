import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** endpoint ของ LINE ที่ตรวจ ID token ให้ — ตรวจทั้งลายเซ็น อายุ และว่าออกให้ channel ของเรา */
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

/** หน้าลูกค้ารอได้ไม่นาน ถ้า LINE ช้ากว่านี้ตอบกลับให้ลองใหม่ดีกว่าค้างหน้าโหลด */
const VERIFY_TIMEOUT_MS = 5_000;

/** ตัวตนของลูกค้าตามที่ LINE ยืนยันให้ */
export interface LineIdentity {
  lineUserId: string;
  displayName: string | null;
}

/**
 * ตรวจ ID token ที่ LIFF ส่งมากับ LINE โดยตรง
 *
 * นี่คือจุดเดียวที่ระบบเชื่อว่า "คนนี้คือเจ้าของบัญชี LINE นี้จริง" — ไม่ถอด JWT เองในเครื่อง
 * เพราะ LINE ตรวจให้ครบทั้งลายเซ็นและ audience ในคำขอเดียว และไม่ต้องดูแลกุญแจของ LINE เอง
 *
 * แยกเป็น injectable เพื่อให้เทสต์สลับตัวปลอมเข้ามาแทนได้ ไม่มีเทสต์ไหนยิงหา LINE จริง
 */
@Injectable()
export class LineIdTokenVerifier {
  private readonly logger = new Logger(LineIdTokenVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<LineIdentity> {
    const channelId = this.config.get<string>('LINE_LIFF_CHANNEL_ID');

    if (!channelId) {
      throw new ServiceUnavailableException(
        'ร้านยังไม่ได้เปิดให้เข้าสู่ระบบผ่าน LINE ในตอนนี้ กรุณาติดต่อทางร้าน',
      );
    }

    let response: Response;
    try {
      response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `ติดต่อ LINE เพื่อตรวจ ID token ไม่ได้: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('ติดต่อ LINE ไม่ได้ในตอนนี้ กรุณาลองใหม่อีกครั้ง');
    }

    // LINE ตอบ 400 เมื่อ token หมดอายุ ปลอม หรือออกให้ channel อื่น — ทุกกรณีคือ "ยืนยันตัวตนไม่ผ่าน"
    if (!response.ok) {
      throw new UnauthorizedException('ยืนยันตัวตนกับ LINE ไม่ผ่าน กรุณาเปิดหน้านี้จาก LINE ใหม่');
    }

    const body = (await response.json()) as { sub?: unknown; name?: unknown };

    if (typeof body.sub !== 'string' || body.sub.length === 0) {
      throw new UnauthorizedException('ยืนยันตัวตนกับ LINE ไม่ผ่าน กรุณาเปิดหน้านี้จาก LINE ใหม่');
    }

    return {
      lineUserId: body.sub,
      displayName: typeof body.name === 'string' ? body.name : null,
    };
  }
}
