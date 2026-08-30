/** รูปแบบ response ที่ทุก endpoint ต้องใช้เหมือนกัน — ลูกค้าที่เอา API ไปต่อจะขอบคุณ */

/** ผลลัพธ์แบบแบ่งหน้า */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * รูปแบบ error เดียวกันทั้งระบบ
 *
 * ตัวอย่าง:
 * {
 *   "statusCode": 400,
 *   "error": "VALIDATION_ERROR",
 *   "message": "startsAt ต้องเป็นเวลาในอนาคต",
 *   "path": "/api/appointments",
 *   "timestamp": "2026-09-01T03:00:00.000Z"
 * }
 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}

/** รหัส error ที่ระบบใช้ — ฝั่ง frontend เอาไปแมปเป็นข้อความภาษาไทยได้ */
export const ApiErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  /** ช่วงเวลาที่ขอจองชนกับนัดอื่นของช่างคนเดียวกัน */
  SLOT_TAKEN: 'SLOT_TAKEN',
  /** เปลี่ยนสถานะนัดข้ามขั้นที่ state machine ไม่อนุญาต */
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** ผลตรวจสุขภาพระบบ — ใช้กับ uptime monitor ภายนอก */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSec: number;
}

export interface DeepHealthResponse extends HealthResponse {
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; message?: string };
    redis: { status: 'ok' | 'error' | 'not_configured'; latencyMs?: number; message?: string };
  };
}
