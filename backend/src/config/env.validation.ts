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

  // ยังไม่บังคับใน Phase 0 — Phase 1 (auth) จะเปลี่ยนเป็น required
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // ยังไม่บังคับใน Phase 0 — Phase 3 (LINE) จะเปลี่ยนเป็น required
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
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

  return env;
}
