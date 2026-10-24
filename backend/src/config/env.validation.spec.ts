import { validateEnv } from './env.validation';

const BASE = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5433/clinicq',
  REDIS_URL: 'redis://localhost:6380',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  JWT_CUSTOMER_SECRET: 'c'.repeat(48),
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

  it('LINE_LIFF_CHANNEL_ID ไม่บังคับ — ไม่ตั้งก็ยังเดโมหน้าลูกค้าได้', () => {
    expect(validateEnv({ ...BASE }).LINE_LIFF_CHANNEL_ID).toBeUndefined();
  });

  it('LIFF_ID ไม่บังคับ และค่าว่างจาก .env ถือว่าไม่ได้ตั้ง', () => {
    expect(validateEnv({ ...BASE }).LIFF_ID).toBeUndefined();
    expect(validateEnv({ ...BASE, LIFF_ID: '' }).LIFF_ID).toBeUndefined();
  });

  it('รับ LIFF_ID ที่รูปแบบถูก', () => {
    expect(validateEnv({ ...BASE, LIFF_ID: '2001234567-AbCdEfGh' }).LIFF_ID).toBe(
      '2001234567-AbCdEfGh',
    );
  });

  it('ไม่ยอมให้แอปขึ้นเมื่อวาง URL เต็มมาแทน LIFF_ID — ลิงก์ในข้อความทุกฉบับจะเสีย', () => {
    expect(() =>
      validateEnv({ ...BASE, LIFF_ID: 'https://liff.line.me/2001234567-AbCdEfGh' }),
    ).toThrow(/LIFF_ID/);
  });
});

describe('validateEnv — Redis', () => {
  it('ไม่ยอมให้แอปขึ้นเมื่อไม่มี REDIS_URL — ตั้งแต่ Phase 4 คิวงานเตือนนัดอยู่บน Redis', () => {
    const { REDIS_URL: _omitted, ...withoutRedis } = BASE;

    expect(() => validateEnv(withoutRedis)).toThrow(/REDIS_URL/);
  });
});

describe('validateEnv — secret ของ session ลูกค้า', () => {
  it('ไม่ยอมให้แอปขึ้นเมื่อไม่มี JWT_CUSTOMER_SECRET', () => {
    const { JWT_CUSTOMER_SECRET: _omitted, ...withoutCustomerSecret } = BASE;

    expect(() => validateEnv(withoutCustomerSecret)).toThrow(/JWT_CUSTOMER_SECRET/);
  });

  it('ไม่ยอมรับ secret สั้นกว่า 32 ตัวอักษร', () => {
    expect(() => validateEnv({ ...BASE, JWT_CUSTOMER_SECRET: 'c'.repeat(31) })).toThrow(
      /JWT_CUSTOMER_SECRET/,
    );
  });

  it('ไม่ยอมให้ซ้ำกับ secret ของ access token — token ลูกค้าจะผ่านลายเซ็นฝั่งพนักงาน', () => {
    expect(() => validateEnv({ ...BASE, JWT_CUSTOMER_SECRET: BASE.JWT_ACCESS_SECRET })).toThrow(
      /JWT_CUSTOMER_SECRET/,
    );
  });

  it('ไม่ยอมให้ซ้ำกับ secret ของ refresh token', () => {
    expect(() => validateEnv({ ...BASE, JWT_CUSTOMER_SECRET: BASE.JWT_REFRESH_SECRET })).toThrow(
      /JWT_CUSTOMER_SECRET/,
    );
  });
});

describe('validateEnv — โหมดเดโม', () => {
  it('ไม่ยอมให้เปิดโหมดเดโมบน production — ทางเข้าแทนลูกค้าต้องไม่หลุดไปถึงร้านจริง', () => {
    expect(() => validateEnv({ ...BASE, NODE_ENV: 'production', DEMO_MODE: 'true' })).toThrow(
      /DEMO_MODE/,
    );
  });

  it('production ที่ปิดโหมดเดโมขึ้นได้ตามปกติ', () => {
    expect(validateEnv({ ...BASE, NODE_ENV: 'production', DEMO_MODE: 'false' }).DEMO_MODE).toBe(
      false,
    );
  });

  it('เปิดโหมดเดโมนอก production ได้', () => {
    expect(validateEnv({ ...BASE, NODE_ENV: 'development', DEMO_MODE: 'true' }).DEMO_MODE).toBe(
      true,
    );
  });
});
