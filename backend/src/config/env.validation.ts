import { z } from 'zod';

/**
 * ตรวจ env ตั้งแต่ตอน boot — ถ้าตั้งค่าผิดให้แอปไม่ขึ้นเลย ดีกว่าไปพังตอนมีลูกค้าใช้อยู่
 *
 * บทเรียนจากงานอัตโนมัติ: ระบบที่ boot ผ่านทั้งที่ config ไม่ครบ จะไปพังเงียบ ๆ
 * ตอนถึงเวลาส่งข้อความจริง ซึ่งกว่าจะรู้ก็คือลูกค้าไม่ได้รับการเตือนนัดไปแล้วหลายวัน
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  TZ: z.string().default('Asia/Bangkok'),

  DATABASE_URL: z.string().min(1, 'ต้องตั้งค่า DATABASE_URL'),
  REDIS_URL: z.string().min(1).optional(),

  FRONTEND_URL: z.string().min(1).default('http://localhost:3000'),

  // ความยาวขั้นต่ำ 32 ตัวอักษร — secret สั้น ๆ เดาได้ และนี่คือกุญแจเข้าถึงข้อมูลลูกค้าทั้งร้าน
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // บังคับตั้งแต่ Phase 3 — ขาดค่าใดค่าหนึ่งแปลว่าเตือนนัดส่งไม่ออกหรือ webhook รับ event ไม่ได้
  // ปล่อยว่างได้เฉพาะตอนรันเทสต์ ซึ่งไม่ได้ยิงหา LINE จริง (ดูเงื่อนไขท้ายไฟล์)
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  /// userId ของแอดมินร้าน — ไม่มีก็รันได้ แค่ไม่มีใครได้รับข้อความแจ้งเตือนฝั่งร้าน
  LINE_ADMIN_USER_ID: z.string().optional(),

  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/** ใช้กับ ConfigModule.forRoot({ validate }) */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `ตั้งค่า environment ไม่ถูกต้อง:\n${problems}\n\nดูตัวอย่างค่าที่ต้องมีได้ที่ backend/.env.example`,
    );
  }

  const env = result.data;

  // TZ ผิดแปลว่างานเตือนนัดจะยิงผิดเวลา — เตือนดัง ๆ ตั้งแต่ตอน boot
  if (env.TZ !== 'Asia/Bangkok') {
    console.warn(
      `[env] TZ ถูกตั้งเป็น "${env.TZ}" ไม่ใช่ Asia/Bangkok — งานตามเวลาจะเพี้ยนไปจากที่ร้านคาดหวัง`,
    );
  }

  // ระบบทั้งหมดตั้งแต่ Phase 3 วางอยู่บน LINE — ขาดค่าพวกนี้แล้วแอปขึ้นได้ตามปกติคือกับดัก
  // เพราะจะไปเงียบตอนถึงเวลาส่งข้อความจริง ซึ่งกว่าจะรู้ก็คือลูกค้าไม่ได้รับการเตือนนัดไปแล้ว
  if (env.NODE_ENV !== 'test') {
    const missing = (
      [
        ['LINE_CHANNEL_ACCESS_TOKEN', env.LINE_CHANNEL_ACCESS_TOKEN],
        ['LINE_CHANNEL_SECRET', env.LINE_CHANNEL_SECRET],
      ] as const
    )
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `ต้องตั้งค่า ${missing.join(' และ ')} ตั้งแต่ Phase 3 เป็นต้นไป\n` +
          'หาค่าได้ที่ LINE Developers Console → channel ของร้าน → Basic settings / Messaging API',
      );
    }
  }

  // ใช้ secret เดียวกันทั้งสองตัวจะทำให้ refresh token ถูกนำไปใช้แทน access token ได้
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error(
      'JWT_ACCESS_SECRET กับ JWT_REFRESH_SECRET ต้องเป็นคนละค่ากัน ไม่งั้น refresh token จะถูกใช้แทน access token ได้',
    );
  }

  return env;
}
