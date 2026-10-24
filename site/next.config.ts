import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // อยู่ใน pnpm monorepo ต้องบอก Next ว่ารากของ workspace อยู่ที่ไหน ไม่งั้น trace ไฟล์ผิดโฟลเดอร์
  outputFileTracingRoot: path.join(import.meta.dirname, '..'),

  images: {
    // ทุกรูปใช้ quality={85} ต้องประกาศไว้ ไม่งั้น Next 16 ปัดกลับเป็น 75
    qualities: [85],
    // ขนาดที่ srcset เลือกได้ บนสุดเท่ากับรูปที่ใหญ่ที่สุดใน public/images (2160px)
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 1920, 2160],
    imageSizes: [64, 96, 128, 256, 384],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
