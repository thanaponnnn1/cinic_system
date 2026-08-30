import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * เวอร์ชันของ API อ่านจาก package.json ครั้งเดียวตอนโหลดโมดูล
 *
 * ทั้งตอนรันจาก dist/ และตอนรันเทสจาก src/ ระยะห่างไปถึง backend/package.json
 * เท่ากันพอดี (ขึ้นสองชั้น) จึงใช้ path เดียวกันได้
 */
function readVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readVersion();
