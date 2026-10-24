import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerAuthGuard } from './customer-auth.guard';

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_CUSTOMER_SECRET: 'c'.repeat(48),
};

/**
 * ขอบของ API ลูกค้า: ใครเข้าอะไรได้ และ customerId มาจากไหน
 *
 * ตัว service ถูกแทนด้วย mock เพราะสิ่งที่พิสูจน์ที่นี่คือสิ่งที่เกิดก่อนถึง service ทั้งหมด
 */
describe('API ลูกค้า — ขอบของ endpoint หน้าร้านและนัด (HTTP)', () => {
  let app: INestApplication;
  let token: string;

  const portal = {
    shop: jest.fn(),
    availability: jest.fn(),
    book: jest.fn(),
    listAppointments: jest.fn(),
    act: jest.fn(),
    courses: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [CustomerPortalController],
      providers: [
        CustomerAuthGuard,
        { provide: CustomerPortalService, useValue: portal },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => ENV[key], getOrThrow: (key: string) => ENV[key] },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

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

    token = await module
      .get(JwtService)
      .signAsync(
        { sub: 'cus_1', typ: 'customer' },
        { secret: ENV.JWT_CUSTOMER_SECRET, expiresIn: 3600 },
      );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(portal).forEach((fn) => fn.mockReset().mockResolvedValue({}));
  });

  it('หน้าร้านเปิดได้โดยไม่ต้องมี token ใด ๆ', async () => {
    await request(app.getHttpServer()).get('/api/customer/shop').expect(200);
    expect(portal.shop).toHaveBeenCalled();
  });

  it('หน้าร้านส่ง slug ของบริการและช่างผ่านออกไปครบ', async () => {
    portal.shop.mockResolvedValue({
      services: [{ id: 'svc_1', name: 'นวดหน้าผ่อนคลาย', slug: 'face-massage' }],
      providers: [{ id: 'prov_1', name: 'คุณเบส', slug: 'best' }],
    });

    const res = await request(app.getHttpServer()).get('/api/customer/shop').expect(200);

    expect(res.body.services[0].slug).toBe('face-massage');
    expect(res.body.providers[0].slug).toBe('best');
  });

  it.each([
    ['get', '/api/customer/availability?serviceId=svc_1&date=2026-10-25'],
    ['get', '/api/customer/appointments'],
    ['post', '/api/customer/appointments'],
    ['patch', '/api/customer/appointments/appt_1/cancel'],
    ['get', '/api/customer/courses'],
  ] as const)('%s %s ไม่มี token ได้ 401 และไม่ถึง service', async (method, url) => {
    await request(app.getHttpServer())[method](url).expect(401);
    expect(Object.values(portal).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it('แนบ customerId มาใน body เพื่อจองแทนคนอื่นไม่ได้ ได้ 400', async () => {
    await request(app.getHttpServer())
      .post('/api/customer/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceId: 'svc_1', startsAt: '2026-10-25T10:00:00+07:00', customerId: 'cus_2' })
      .expect(400);
    expect(portal.book).not.toHaveBeenCalled();
  });

  it('จองด้วย customerId จาก token เท่านั้น', async () => {
    await request(app.getHttpServer())
      .post('/api/customer/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ serviceId: 'svc_1', startsAt: '2026-10-25T10:00:00+07:00' })
      .expect(201);

    expect(portal.book).toHaveBeenCalledWith('cus_1', {
      serviceId: 'svc_1',
      startsAt: '2026-10-25T10:00:00+07:00',
    });
  });

  it('ปุ่มยกเลิกส่งต่อเป็นการกระทำ cancel ของลูกค้าใน token', async () => {
    await request(app.getHttpServer())
      .patch('/api/customer/appointments/appt_1/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(portal.act).toHaveBeenCalledWith('cus_1', 'appt_1', 'cancel');
  });

  it('วันที่ผิดรูปแบบได้ 400 ก่อนถึงตัวคำนวณช่องว่าง', async () => {
    await request(app.getHttpServer())
      .get('/api/customer/availability?serviceId=svc_1&date=2026-02-30')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(portal.availability).not.toHaveBeenCalled();
  });
});
