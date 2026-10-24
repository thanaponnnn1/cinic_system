import type { Request } from 'express';

/** ดึงโทเคนจาก header `Authorization: Bearer ...` — ใช้ทั้ง guard พนักงานและ guard ลูกค้า */
export function bearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;

  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}
