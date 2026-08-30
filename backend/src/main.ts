import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BRAND_INFO } from '@clinicq/shared';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { APP_VERSION } from './common/app-version';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = config.get<number>('PORT', 3001);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  // /health อยู่นอก prefix เพราะ uptime monitor ภายนอกยิงที่ /health ตรง ๆ
  app.setGlobalPrefix('api', { exclude: ['health', 'health/deep'] });

  app.useGlobalPipes(
    new ValidationPipe({
      // ตัด field ที่ไม่ได้ประกาศใน DTO ทิ้ง — กันข้อมูลแปลกปลอมหลุดเข้าฐานข้อมูล
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: isProduction ? [frontendUrl] : true,
    credentials: true,
  });

  // เอกสาร API เปิดเฉพาะตอนไม่ใช่ production — บน production ของลูกค้าจริงไม่ควรเปิดสาธารณะ
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${BRAND_INFO.productName} API`)
      .setDescription(
        `${BRAND_INFO.fullName}\n\n${BRAND_INFO.tagline}\n\n` +
          'ระบบนัดหมายและดูแลลูกค้าสำหรับคลินิกและร้านเสริมสวย — ' +
          'เตือนนัดผ่าน LINE, คิวว่างอัตโนมัติ, ติดตามลูกค้าที่หายไป และแจ้งเตือนคอร์สใกล้หมดอายุ',
      )
      .setVersion(APP_VERSION)
      .addBearerAuth()
      .addTag('ระบบ', 'ตรวจสถานะและข้อมูลทั่วไปของ API')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`${BRAND_INFO.productName} API v${APP_VERSION} พร้อมใช้งาน`);
  logger.log(`   API      → http://localhost:${port}/api`);
  logger.log(`   Health   → http://localhost:${port}/health`);
  if (!isProduction) {
    logger.log(`   เอกสาร   → http://localhost:${port}/docs`);
  }
  logger.log(`   เขตเวลา  → ${process.env.TZ ?? 'ไม่ได้ตั้งค่า'} (${new Date().toString()})`);
}

void bootstrap();
