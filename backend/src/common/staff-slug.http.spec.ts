import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiErrorCode } from '@clinicq/shared';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesController } from '../services/services.controller';
import { ServicesService } from '../services/services.service';
import { ProvidersController } from '../providers/providers.controller';
import { ProvidersService } from '../providers/providers.service';

/**
 * slug ของบริการและช่างที่พนักงานตั้งเอง — ปุ่มจองในเว็บร้านลิงก์มาด้วยค่านี้
 *
 * ใช้ controller กับ service ตัวจริง แทนแค่ Prisma ด้วย mock เพราะสิ่งที่พิสูจน์คือสิ่งที่ผู้เรียก API เห็น:
 * slug รูปแบบผิดได้ 400 ก่อนถึงฐานข้อมูล และ slug ซ้ำได้ 409 ภาษาไทย ไม่ใช่ 500 หรือข้อความดิบของ Prisma
 * ไม่ใส่ guard สิทธิ์ เพราะเรื่องสิทธิ์ ADMIN ไม่ได้เปลี่ยนในงานนี้
 */

const ROW = {
  service: {
    id: 'svc_1',
    name: 'นวดหน้าผ่อนคลาย',
    durationMin: 30,
    price: { toString: () => '600' },
    imageUrl: null,
    isActive: true,
  },
  provider: { id: 'prov_1', name: 'คุณเบส', title: null, photoUrl: null, isActive: true },
};

const RESOURCES = [
  {
    path: 'services',
    model: 'service',
    owner: 'บริการ',
    body: { name: 'นวดหน้าผ่อนคลาย', durationMin: 30, price: 600 },
  },
  { path: 'providers', model: 'provider', owner: 'ช่าง', body: { name: 'คุณเบส' } },
] as const;

/** error ที่ Prisma โยนตอนชน unique — มีแค่ code ที่โค้ดเราอ่าน */
const UNIQUE_VIOLATION = Object.assign(
  new Error('Unique constraint failed on the fields: (`slug`)'),
  {
    code: 'P2002',
  },
);

describe('slug ของบริการและช่าง (HTTP)', () => {
  let app: INestApplication;

  const db = {
    service: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    provider: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ServicesController, ProvidersController],
      providers: [ServicesService, ProvidersService, { provide: PrismaService, useValue: db }],
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    for (const model of RESOURCES.map((r) => r.model)) {
      const row = ROW[model];
      db[model].findUnique.mockReset().mockResolvedValue(row);
      db[model].create
        .mockReset()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ ...row, slug: null, ...data }),
        );
      db[model].update
        .mockReset()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ ...row, slug: null, ...data }),
        );
    }
  });

  describe.each(RESOURCES)('/api/$path', ({ path, model, owner, body }) => {
    it.each(['face-massage', 'best', 'a1-b2-c3', 'a'.repeat(60)])(
      'slug "%s" ถูกรูปแบบ บันทึกและส่งกลับใน response',
      async (slug) => {
        const res = await request(app.getHttpServer())
          .post(`/api/${path}`)
          .send({ ...body, slug })
          .expect(201);

        expect(res.body.slug).toBe(slug);
        expect(db[model].create).toHaveBeenCalledWith({
          data: expect.objectContaining({ slug }) as unknown,
        });
      },
    );

    it.each([
      ['ตัวพิมพ์ใหญ่', 'Face-Massage'],
      ['ช่องว่าง', 'face massage'],
      ['ขีดนำหน้า', '-face'],
      ['ขีดท้าย', 'face-'],
      ['ขีดติดกัน', 'face--massage'],
      ['ภาษาไทย', 'นวดหน้า'],
      ['ขีดล่าง', 'face_massage'],
      ['ยาวเกิน 60', 'a'.repeat(61)],
      ['สตริงว่าง', ''],
    ])('slug %s (%s) ได้ 400 และไม่ถึงฐานข้อมูล', async (_label, slug) => {
      const res = await request(app.getHttpServer())
        .post(`/api/${path}`)
        .send({ ...body, slug })
        .expect(400);

      expect(res.body.error).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(JSON.stringify(res.body.message)).toContain('slug');
      expect(db[model].create).not.toHaveBeenCalled();
    });

    it('แก้ slug เป็นรูปแบบผิดได้ 400 และไม่ถึงฐานข้อมูล', async () => {
      await request(app.getHttpServer())
        .patch(`/api/${path}/x1`)
        .send({ slug: 'Not OK' })
        .expect(400);
      expect(db[model].update).not.toHaveBeenCalled();
    });

    it.each([
      ['post', `/api/${path}`, { ...body, slug: 'taken' }, 'create'],
      ['patch', `/api/${path}/x1`, { slug: 'taken' }, 'update'],
    ] as const)(
      '%s slug ที่มีคนใช้แล้วได้ 409 ภาษาไทยที่บอก slug ไม่ใช่ error ดิบของ Prisma',
      async (method, url, payload, write) => {
        db[model][write].mockRejectedValue(UNIQUE_VIOLATION);

        const res = await request(app.getHttpServer())[method](url).send(payload).expect(409);

        expect(res.body).toMatchObject({
          error: ApiErrorCode.CONFLICT,
          message: `slug "taken" ถูกใช้กับ${owner}อื่นแล้ว เลือกชื่ออื่น`,
        });
        expect(JSON.stringify(res.body)).not.toMatch(/P2002|Unique constraint/);
      },
    );

    it('error อื่นของฐานข้อมูลไม่ถูกเหมาเป็น slug ซ้ำ ยังเป็น 500 ตามเดิม', async () => {
      db[model].create.mockRejectedValue(new Error('connection reset'));

      const res = await request(app.getHttpServer())
        .post(`/api/${path}`)
        .send({ ...body, slug: 'fine' })
        .expect(500);

      expect(res.body.error).toBe(ApiErrorCode.INTERNAL_ERROR);
    });
  });
});
