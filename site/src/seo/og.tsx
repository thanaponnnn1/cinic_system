import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

export const OG_SIZE = { width: 1200, height: 630 };

const fontDir = path.join(process.cwd(), 'assets', 'fonts');

/** ตัวอักษรของภาพแชร์ ไฟล์ TTF อยู่ใน assets/fonts (สัญญาอนุญาต OFL อยู่ข้างกัน) */
async function fonts() {
  const [thai, serif] = await Promise.all([
    readFile(path.join(fontDir, 'NotoSansThai-Medium.ttf')),
    readFile(path.join(fontDir, 'PlayfairDisplay-Medium.ttf')),
  ]);
  return [
    { name: 'Playfair', data: serif, weight: 500 as const, style: 'normal' as const },
    { name: 'NotoThai', data: thai, weight: 500 as const, style: 'normal' as const },
  ];
}

/** ตัวสร้างภาพแชร์รองรับแค่ PNG/JPEG จึงแปลงรูป webp เป็น JPEG ก่อน */
async function photoDataUrl(src: string, width: number, height: number): Promise<string> {
  const file = path.join(process.cwd(), 'public', src);
  const jpeg = await sharp(file)
    .resize(width, height, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

export async function renderOg({
  eyebrow,
  title,
  subtitle,
  photo,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  photo: string;
}) {
  const image = await photoDataUrl(photo, 480, 630);
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#060d15',
        color: '#fcf1c4',
        fontFamily: 'Playfair, NotoThai',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 56px 56px 72px',
          width: 720,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 44, letterSpacing: 3, color: '#e3cd9b' }}>THNP</span>
          <span style={{ fontSize: 18, letterSpacing: 10, color: '#c0a472' }}>CLINIC</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 24, color: '#d3bc88' }}>{eyebrow}</span>
          <span style={{ fontSize: 68, lineHeight: 1.25, marginTop: 12 }}>{title}</span>
          <span style={{ fontSize: 28, color: 'rgba(252,241,196,0.75)', marginTop: 20 }}>
            {subtitle}
          </span>
        </div>
        <div style={{ display: 'flex', height: 2, width: 140, background: '#d3bc88' }} />
      </div>
      <img src={image} width={480} height={630} alt="" style={{ objectFit: 'cover' }} />
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}
