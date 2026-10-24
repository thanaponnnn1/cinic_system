/**
 * เปลี่ยนรหัสผ่านของบัญชีฝั่งร้าน
 *
 * รันด้วย: pnpm --filter @clinicq/backend user:set-password <อีเมล>
 *   ตั้ง NEW_PASSWORD ไว้ = ใช้ค่านั้น · ไม่ตั้ง = สุ่มรหัสใหม่แล้วพิมพ์ออกจอครั้งเดียว
 *
 * ไม่รับรหัสเป็น argument เพราะจะค้างอยู่ใน history ของ shell
 * seed ไม่ทับรหัสของบัญชีที่มีอยู่แล้ว สคริปต์นี้จึงเป็นทางเดียวที่เปลี่ยนรหัสจาก terminal ได้
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

/** ตรงกับขั้นต่ำของหน้าเข้าสู่ระบบ (LoginDto) — ตั้งสั้นกว่านี้แล้วจะล็อกอินไม่ได้ */
const MIN_LENGTH = 8;

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('ต้องระบุอีเมล เช่น pnpm user:set-password owner@thnpclinic.com');

  const given = process.env.NEW_PASSWORD;
  const password = given || randomBytes(12).toString('base64url');
  if (password.length < MIN_LENGTH) {
    throw new Error(`NEW_PASSWORD ต้องยาวอย่างน้อย ${MIN_LENGTH} ตัวอักษร`);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error(`ไม่พบบัญชี ${email}`);

    const passwordHash = await bcrypt.hash(password, 12);

    // ตัด refresh token ทุกใบไปพร้อมกัน — เปลี่ยนรหัสเพราะสงสัยว่ารั่ว แต่เครื่องที่ล็อกอินค้างไว้
    // ยังต่ออายุได้ต่อ ก็เท่ากับไม่ได้เปลี่ยน
    const [, revoked] = await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    console.log(`เปลี่ยนรหัสผ่านของ ${email} แล้ว · ออกจากระบบทุกเครื่อง ${revoked.count} เซสชัน`);
    if (!given) console.log(`รหัสผ่านใหม่: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('เปลี่ยนรหัสผ่านไม่สำเร็จ:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
