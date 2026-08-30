import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiErrorCode, type ApiErrorResponse } from '@clinicq/shared';
import type { Request, Response } from 'express';

/**
 * แปลง exception ทุกชนิดให้เป็น response หน้าตาเดียวกันทั้งระบบ
 *
 * เหตุผลที่ต้องมี: ลูกค้าที่เอา API ไปต่อกับระบบอื่น ต้องเขียนโค้ดอ่าน error
 * แค่แบบเดียว ไม่ใช่เดาว่า endpoint ไหนคืนอะไร — เป็นส่วนหนึ่งของ "เอกสาร API" ที่เราสัญญาไว้
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, errorCode, message } = this.parse(exception);

    // 5xx คือบั๊กของเรา ต้องเห็น stack เต็ม — 4xx คือผู้เรียกส่งมาผิด บันทึกสั้นพอ
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${statusCode} ${errorCode}`);
    }

    const body: ApiErrorResponse = {
      statusCode,
      error: errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private parse(exception: unknown): {
    statusCode: number;
    errorCode: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { statusCode, errorCode: this.codeFromStatus(statusCode), message: payload };
      }

      const record = payload as Record<string, unknown>;
      // ValidationPipe คืน message เป็น array ของข้อความ — ส่งต่อทั้งชุดให้ผู้เรียกแก้ได้ครบในรอบเดียว
      const message = (record.message ?? exception.message) as string | string[];
      const errorCode =
        typeof record.error === 'string' && record.error.toUpperCase() === record.error
          ? record.error
          : this.codeFromStatus(statusCode);

      return { statusCode, errorCode, message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ApiErrorCode.INTERNAL_ERROR,
      // ห้ามส่งรายละเอียด internal error ออกไปข้างนอก — ดูใน log แทน
      message: 'เกิดข้อผิดพลาดภายในระบบ',
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }
}
