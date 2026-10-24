import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // อยู่ใน pnpm monorepo — ต้องบอก Next ว่ารากของ workspace อยู่ที่ไหน
  // ไม่งั้นตอน build จะไล่ trace ไฟล์ผิดโฟลเดอร์
  outputFileTracingRoot: path.join(__dirname, '..'),

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  },

  // หน้าแอปจองของลูกค้าห้ามขึ้น Google — metadata ใน layout ครอบแค่ HTML ส่วนนี้ครอบ API ด้วย
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex' }];
    return [
      { source: '/c', headers: noindex },
      { source: '/c/:path*', headers: noindex },
      { source: '/api/customer/:path*', headers: noindex },
    ];
  },
};

export default nextConfig;
