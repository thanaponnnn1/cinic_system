import { validateEnv } from './env.validation';

const BASE = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5433/clinicq',
  REDIS_URL: 'redis://localhost:6380',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  LINE_CHANNEL_ACCESS_TOKEN: 'token-จาก-line',
  LINE_CHANNEL_SECRET: 'secret-จาก-line',
};

describe('validateEnv — ค่าของ LINE', () => {
  it('ผ่านเมื่อตั้งค่า LINE ครบ', () => {
    expect(validateEnv({ ...BASE }).LINE_CHANNEL_SECRET).toBe('secret-จาก-line');
  });

  it('ไม่ยอมให้แอปขึ้นเมื่อไม่มี LINE_CHANNEL_ACCESS_TOKEN — ตั้งแต่ Phase 3 ระบบส่งข้อความไม่ได้ถ้าขาดค่านี้', () => {
    const { LINE_CHANNEL_ACCESS_TOKEN: _omitted, ...withoutToken } = BASE;

    expect(() => validateEnv(withoutToken)).toThrow(/LINE_CHANNEL_ACCESS_TOKEN/);
  });

  it('ไม่ยอมให้แอปขึ้นเมื่อไม่มี LINE_CHANNEL_SECRET — webhook จะรับ event ปลอมไม่ได้ถ้าขาดค่านี้', () => {
    const { LINE_CHANNEL_SECRET: _omitted, ...withoutSecret } = BASE;

    expect(() => validateEnv(withoutSecret)).toThrow(/LINE_CHANNEL_SECRET/);
  });

  it('ยอมให้ว่างได้ตอนรันเทสต์ เพราะเทสต์ไม่ได้ยิงหา LINE จริง', () => {
    const { LINE_CHANNEL_ACCESS_TOKEN: _t, LINE_CHANNEL_SECRET: _s, ...rest } = BASE;

    expect(() => validateEnv({ ...rest, NODE_ENV: 'test' })).not.toThrow();
  });
});

describe('validateEnv — Redis', () => {
  it('ไม่ยอมให้แอปขึ้นเมื่อไม่มี REDIS_URL — ตั้งแต่ Phase 4 คิวงานเตือนนัดอยู่บน Redis', () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = BASE;

    expect(() => validateEnv(withoutRedis)).toThrow(/REDIS_URL/);
  });
});
