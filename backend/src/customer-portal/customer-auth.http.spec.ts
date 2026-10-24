import { Controller, Get, type INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiErrorCode, Role } from '@clinicq/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { ClockService } from '../clock/clock.service';
import { LineAccountLinkService } from '../line/line-account-link.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { LineIdTokenVerifier } from './line-id-token.verifier';

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  JWT_CUSTOMER_SECRET: 'c'.repeat(48),
};

/** endpoint ฝั่งพนักงานตัวแทน — ใช้พิสูจน์ว่า token ลูกค้าเปิดหน้าจอร้านไม่ได้ */
@Controller('staff-probe')
class StaffProbeController {
  @Get()
  ok(): { ok: true } {
    return { ok: true };
  }
}

const SOMYING = {
  id: 'cus_1',
  name: 'สมหญิง ใจดี',
  lineUserId: 'Uline1',
  consentReminder: true,
  consentMarketing: false,
  isActive: true,
};

/**
 * ประกอบแอปด้วย guard ระดับแอปชุดเดียวกับของจริง (JwtAuthGuard + RolesGuard)
 * เพื่อพิสูจน์ว่า @Public() ปล่อย endpoint ลูกค้าผ่าน guard พนักงาน และ CustomerAuthGuard
 * เป็นด่านเดียวที่ตัดสินว่าใครคือลูกค้า
 */
describe('API ลูกค้า — ยืนยันตัวตนและทางเข้าเดโม (HTTP)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  const customerDb = { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() };
  const clock = { demoMode: true, now: () => new Date('2026-10-24T03:00:00.000Z') };
  const verifier = { verify: jest.fn() };
  const accountLink = { link: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [CustomerAuthController, StaffProbeController],
      providers: [
        CustomerAuthService,
        CustomerAuthGuard,
        LineIdTokenVerifier,
        { provide: PrismaService, useValue: { customer: customerDb } },
        { provide: ClockService, useValue: clock },
        { provide: LineAccountLinkService, useValue: accountLink },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => ENV[key], getOrThrow: (key: string) => ENV[key] },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    })
      .overrideProvider(LineIdTokenVerifier)
      .useValue(verifier)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    [...Object.values(customerDb), verifier.verify, accountLink.link].forEach((fn) =>
      fn.mockReset(),
    );
    clock.demoMode = true;
    customerDb.findUnique.mockResolvedValue(null);
    verifier.verify.mockResolvedValue({ lineUserId: 'Uline1', displayName: 'Somying' });
  });

  const customerToken = (payload: object = { sub: 'cus_1', typ: 'customer' }) =>
    jwt.signAsync(payload, { secret: ENV.JWT_CUSTOMER_SECRET, expiresIn: 3600 });

  describe('CustomerAuthGuard', () => {
    // ลูกค้ามีตัวตนในฐานข้อมูลเสมอ 401 ที่ได้ในกลุ่มนี้จึงมาจาก guard เท่านั้น
    beforeEach(() => customerDb.findUnique.mockResolvedValue(SOMYING));

    it('ไม่มี token ได้ 401', async () => {
      await request(app.getHttpServer()).get('/api/customer/me').expect(401);
    });

    it('ไม่รับ access token ของพนักงาน แม้จะเป็นของ ADMIN', async () => {
      const staffToken = await jwt.signAsync(
        { sub: 'user_1', email: 'owner@thnpclinic.com', role: Role.ADMIN },
        { secret: ENV.JWT_ACCESS_SECRET, expiresIn: 3600 },
      );

      await request(app.getHttpServer())
        .get('/api/customer/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(401);
    });

    it('ไม่รับ token ที่เซ็นด้วย secret ลูกค้าแต่ typ ไม่ใช่ customer', async () => {
      const wrongType = await customerToken({ sub: 'cus_1', typ: 'staff' });

      await request(app.getHttpServer())
        .get('/api/customer/me')
        .set('Authorization', `Bearer ${wrongType}`)
        .expect(401);
    });

    it('ไม่รับ token ที่ไม่มี typ เลย', async () => {
      const noType = await customerToken({ sub: 'cus_1' });

      await request(app.getHttpServer())
        .get('/api/customer/me')
        .set('Authorization', `Bearer ${noType}`)
        .expect(401);
    });

    it('token ลูกค้าที่ถูกต้องผ่าน และเห็นข้อมูลของคนใน token — ไม่มีเบอร์โทร', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/customer/me')
        .set('Authorization', `Bearer ${await customerToken()}`)
        .expect(200);

      expect(res.body).toEqual({
        id: 'cus_1',
        name: 'สมหญิง ใจดี',
        hasLineLinked: true,
        consentReminder: true,
        consentMarketing: false,
      });
      expect(customerDb.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cus_1' } }),
      );
    });

    it('token ลูกค้าเปิด endpoint ของพนักงานไม่ได้', async () => {
      await request(app.getHttpServer())
        .get('/api/staff-probe')
        .set('Authorization', `Bearer ${await customerToken()}`)
        .expect(401);
    });
  });

  describe('POST auth/liff', () => {
    it('บัญชี LINE ที่ผูกแล้วได้ token ลูกค้าที่ guard รับ', async () => {
      customerDb.findUnique.mockResolvedValue(SOMYING);

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/liff')
        .send({ idToken: 'id-token' })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'ok', customer: { id: 'cus_1' } });
      await expect(
        jwt.verifyAsync(res.body.token, { secret: ENV.JWT_CUSTOMER_SECRET }),
      ).resolves.toMatchObject({ sub: 'cus_1', typ: 'customer' });
    });

    it('บัญชี LINE ที่ยังไม่ผูกได้ needs_link และไม่มี token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/liff')
        .send({ idToken: 'id-token' })
        .expect(200);

      expect(res.body).toEqual({ status: 'needs_link' });
    });
  });

  describe('POST auth/register', () => {
    const body = {
      idToken: 'id-token',
      name: 'ลูกค้าใหม่',
      phone: '081-234-5678',
      consentReminder: false,
      consentMarketing: false,
    };

    it('เบอร์ที่มีอยู่แล้วได้ 409 ไม่สร้างซ้ำ และไม่บอกว่าเบอร์นี้เป็นของใคร', async () => {
      customerDb.findUnique.mockImplementation(({ where }: { where: { phone?: string } }) =>
        Promise.resolve(where.phone ? { id: 'cus_9', name: 'มาลี รุ่งเรือง' } : null),
      );

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/register')
        .send(body)
        .expect(409);

      expect(res.body.error).toBe(ApiErrorCode.PHONE_ALREADY_REGISTERED);
      expect(JSON.stringify(res.body)).not.toContain('มาลี');
      expect(customerDb.create).not.toHaveBeenCalled();
    });

    it('ไม่ให้ความยินยอมเลย consentAt ต้องว่าง และเก็บเบอร์เป็นตัวเลขล้วน', async () => {
      customerDb.create.mockResolvedValue({ ...SOMYING, id: 'cus_new' });

      await request(app.getHttpServer()).post('/api/customer/auth/register').send(body).expect(200);

      expect(customerDb.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '0812345678',
            lineUserId: 'Uline1',
            consentAt: null,
          }),
        }),
      );
    });

    it('ให้ความยินยอมช่องใดช่องหนึ่ง consentAt ต้องถูกบันทึก', async () => {
      customerDb.create.mockResolvedValue({ ...SOMYING, id: 'cus_new' });

      await request(app.getHttpServer())
        .post('/api/customer/auth/register')
        .send({ ...body, consentMarketing: true })
        .expect(200);

      const { data } = customerDb.create.mock.calls[0][0] as { data: { consentAt: unknown } };
      expect(data.consentAt).toBeInstanceOf(Date);
    });

    it('ไม่ส่งช่องความยินยอมมาเลยได้ 400 — ต้องเห็นว่าลูกค้าเลือกเอง', async () => {
      const { consentMarketing: _omitted, ...withoutConsent } = body;

      await request(app.getHttpServer())
        .post('/api/customer/auth/register')
        .send(withoutConsent)
        .expect(400);
      expect(customerDb.create).not.toHaveBeenCalled();
    });

    it('LINE ที่ผูกกับลูกค้าแล้วกดสมัครซ้ำ ได้เข้าเป็นคนเดิมโดยไม่สร้างใหม่', async () => {
      customerDb.findUnique.mockResolvedValue(SOMYING);

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/register')
        .send(body)
        .expect(200);

      expect(res.body.customer.id).toBe('cus_1');
      expect(customerDb.create).not.toHaveBeenCalled();
    });
  });

  describe('POST auth/link', () => {
    it('รหัสใช้ไม่ได้ได้ 400', async () => {
      accountLink.link.mockResolvedValue({ status: 'code_not_found' });

      await request(app.getHttpServer())
        .post('/api/customer/auth/link')
        .send({ idToken: 'id-token', code: '111111' })
        .expect(400);
    });

    it('LINE ผูกกับคนอื่นอยู่แล้วได้ 409', async () => {
      accountLink.link.mockResolvedValue({ status: 'line_already_linked_to_other' });

      await request(app.getHttpServer())
        .post('/api/customer/auth/link')
        .send({ idToken: 'id-token', code: '482913' })
        .expect(409);
    });

    it('ผูกสำเร็จได้ token ของลูกค้าที่ถือรหัส', async () => {
      accountLink.link.mockResolvedValue({
        status: 'linked',
        customer: { id: 'cus_1', name: SOMYING.name },
      });
      customerDb.findUnique.mockResolvedValue(SOMYING);

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/link')
        .send({ idToken: 'id-token', code: '482913' })
        .expect(200);

      expect(accountLink.link).toHaveBeenCalledWith('482913', 'Uline1');
      expect(res.body).toMatchObject({ status: 'ok', customer: { id: 'cus_1' } });
    });
  });

  describe('ทางเข้าโหมดเดโม', () => {
    it('ทุก endpoint เดโมได้ 403 และไม่แตะข้อมูลเมื่อปิดโหมดเดโม', async () => {
      clock.demoMode = false;
      const server = app.getHttpServer();

      await request(server).get('/api/customer/demo/customers').expect(403);
      await request(server)
        .post('/api/customer/auth/demo')
        .send({ customerId: 'cus_1' })
        .expect(403);
      await request(server)
        .post('/api/customer/auth/demo-register')
        .send({
          name: 'เจ้าของร้าน',
          phone: '0899999999',
          consentReminder: true,
          consentMarketing: false,
        })
        .expect(403);

      expect(customerDb.findMany).not.toHaveBeenCalled();
      expect(customerDb.findUnique).not.toHaveBeenCalled();
      expect(customerDb.create).not.toHaveBeenCalled();
    });

    it('รายชื่อเดโมเปิดได้โดยไม่ต้องมี token และคืนแค่ id กับชื่อ', async () => {
      customerDb.findMany.mockResolvedValue([{ id: 'cus_1', name: 'สมหญิง ใจดี' }]);

      const res = await request(app.getHttpServer())
        .get('/api/customer/demo/customers')
        .expect(200);

      expect(res.body).toEqual([{ id: 'cus_1', name: 'สมหญิง ใจดี' }]);
      expect(customerDb.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, name: true } }),
      );
    });

    it('เข้าเป็นลูกค้าที่เลือกได้ token ของคนนั้น', async () => {
      customerDb.findUnique.mockResolvedValue(SOMYING);

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/demo')
        .send({ customerId: 'cus_1' })
        .expect(200);

      await expect(
        jwt.verifyAsync(res.body.token, { secret: ENV.JWT_CUSTOMER_SECRET }),
      ).resolves.toMatchObject({ sub: 'cus_1', typ: 'customer' });
    });

    it('สมัครเดโมสร้างลูกค้าที่ไม่มี lineUserId', async () => {
      customerDb.create.mockResolvedValue({ ...SOMYING, id: 'cus_demo', lineUserId: null });

      const res = await request(app.getHttpServer())
        .post('/api/customer/auth/demo-register')
        .send({
          name: 'เจ้าของร้าน',
          phone: '0899999999',
          consentReminder: true,
          consentMarketing: false,
        })
        .expect(200);

      expect(customerDb.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lineUserId: null }) }),
      );
      expect(res.body.customer.hasLineLinked).toBe(false);
    });
  });
});
