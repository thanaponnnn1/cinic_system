// แปลงรูปเดโมเป็น site/public/images/<name>.webp และเขียน content/images.manifest.json
// รันซ้ำได้ ผลลัพธ์ byte-for-byte เดิมเสมอ และลบ webp ที่ไม่อยู่ในตารางทิ้ง
// ใช้: pnpm --filter @clinicq/site images [-- --src <โฟลเดอร์ jpg>]  (ค่าเริ่มต้น frontend/img)
//
// รูปเดโมกว้างแค่ 736px จึงขยาย 2 เท่าด้วย lanczos3 แล้วเพิ่มความคมเล็กน้อย
// วิธีนี้ไม่เพิ่มรายละเอียดจริง (ไม่ใช่ AI) แค่ให้ขอบไม่แตกเป็นขั้นเมื่อแสดงใหญ่ขึ้น
// เลย์เอาต์จึงต้องไม่แสดงรูปใหญ่เกิน 1.3 เท่าของความกว้างไฟล์

import { error, log } from 'node:console';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

const UPSCALE = 2;
const MAX_WIDTH = 2400;
const MAX_BYTES = 400 * 1024;
const QUALITY_START = 82;
const QUALITY_FLOOR = 70;
const QUALITY_STEP = 4;

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: { src: { type: 'string' } } });
const srcDir = path.resolve(values.src ?? path.join(siteDir, '..', 'frontend', 'img'));
const outDir = path.join(siteDir, 'public', 'images');
const manifestPath = path.join(siteDir, 'content', 'images.manifest.json');

// ห้ามใช้: a538b1a2 (เคาน์เตอร์มีป้าย "SERENITY SPA" ของแบรนด์อื่น), 37909a49, 3c631b97
// 7b94ca76 (ผู้ปรึกษาเสื้อกาวน์ถือเอกสารรักษาสิว ชื่อยา ป้าย DERMATOLOGY และขวดแบรนด์อื่น ดูเป็นการแพทย์)
const FORBIDDEN = ['a538b1a2', '37909a49', '3c631b97', '7b94ca76'];

// crop = พิกัดในรูปต้นฉบับ (หลังหมุนตาม EXIF) ทุกชิ้นที่ครอปเพิ่มด้านสั้นอย่างน้อย 500px ก่อนขยาย
// ครอปที่ตัดขอบล่างขวาคือการตัดสัญลักษณ์ดาวสี่แฉกของเครื่องมือสร้างภาพออก
const IMAGES = [
  { name: 'hero-lounge', prefix: '24fdd3e2' },
  { name: 'lounge-arch-niche', prefix: '24fdd3e2', crop: [236, 150, 500, 600] },
  { name: 'lounge-candle-table', prefix: '24fdd3e2', crop: [0, 560, 736, 544] },
  // ตัดครึ่งบนที่มีป้ายโลโก้บนผนังออก
  { name: 'space-counter', prefix: 'b426f158', crop: [0, 340, 736, 764] },
  { name: 'space-treatment-room', prefix: 'e8753658' },
  { name: 'treatment-room-vanity', prefix: 'e8753658', crop: [0, 180, 736, 540] },
  { name: 'treatment-room-bed', prefix: 'e8753658', crop: [60, 560, 676, 537] },
  { name: 'space-twin-room', prefix: 'cb0f1f00', crop: [0, 0, 680, 680] },
  { name: 'twin-room-candles', prefix: 'cb0f1f00', crop: [120, 180, 500, 500] },
  // ตัดป้ายทอง "TS" มุมขวาบนออก
  { name: 'space-pedicure-lounge', prefix: '96ac1c26', crop: [0, 236, 670, 500] },
  { name: 'space-hair-studio', prefix: '4e790a68' },
  { name: 'hair-studio-chair', prefix: '4e790a68', crop: [236, 150, 500, 500] },
  { name: 'hair-studio-bed', prefix: '4e790a68', crop: [0, 150, 500, 500] },
  // ตัดอักษร "AG" มุมซ้ายบนออก
  { name: 'facial-treatment', prefix: 'dadcabbc', crop: [0, 70, 736, 1034] },
  { name: 'facial-treatment-therapist', prefix: 'dadcabbc', crop: [200, 280, 536, 580] },
  { name: 'facial-treatment-tray', prefix: 'dadcabbc', crop: [0, 600, 736, 504] },
  { name: 'facial-cleansing', prefix: '7ec136b2' },
  { name: 'facial-cleansing-therapist', prefix: '7ec136b2', crop: [116, 150, 700, 700] },
  { name: 'facial-cleansing-hands', prefix: '7ec136b2', crop: [0, 900, 700, 556] },
  { name: 'face-massage', prefix: '7ecea3ac' },
  { name: 'eye-care', prefix: '64910154' },
  { name: 'eye-care-mask', prefix: '64910154', crop: [0, 250, 736, 540] },
  { name: 'eye-care-tray', prefix: '64910154', crop: [0, 760, 736, 528] },
  { name: 'hair-treatment', prefix: '1ddd5401' },
  { name: 'hair-treatment-wash', prefix: '1ddd5401', crop: [0, 500, 1080, 950] },
  { name: 'wash-blowdry', prefix: '62b42005' },
  { name: 'haircut', prefix: '33afed46' },
  { name: 'haircut-scissors', prefix: '33afed46', crop: [0, 300, 1024, 600] },
  { name: 'haircut-client', prefix: '33afed46', crop: [0, 800, 1024, 736] },
  { name: 'hair-styling', prefix: 'dc5bc364' },
  { name: 'styling-shelves', prefix: 'dc5bc364', crop: [0, 0, 500, 700] },
  { name: 'staff-nan', prefix: '5cf36190' },
  { name: 'staff-best', prefix: 'dc5bc364', crop: [336, 0, 400, 400] },
  { name: 'staff-fah', prefix: '62b42005', crop: [300, 60, 436, 436] },
  { name: 'review-portrait-1', prefix: 'f0367597', crop: [60, 120, 615, 615] },
  { name: 'review-portrait-2', prefix: '80f9e13b', crop: [150, 100, 450, 450] },
];

async function resolveSources() {
  const files = (await readdir(srcDir)).filter((file) => file.toLowerCase().endsWith('.jpg'));
  const problems = [];
  const resolved = IMAGES.map((image) => {
    if (FORBIDDEN.includes(image.prefix))
      problems.push(`${image.name}: ${image.prefix} is forbidden`);
    const matches = files.filter((file) => file.startsWith(image.prefix));
    if (matches.length !== 1) {
      problems.push(`${image.name}: prefix ${image.prefix} matches ${JSON.stringify(matches)}`);
    }
    return { ...image, file: matches[0] };
  });
  if (problems.length > 0) {
    throw new Error(`cannot resolve sources in ${srcDir}\n  ${problems.join('\n  ')}`);
  }
  return resolved;
}

async function buildPipeline({ file, crop }) {
  // rotate() ต้องมาก่อน extract() เพื่อให้พิกัดครอปอิงภาพที่ตั้งตรงแล้ว
  const upright = await sharp(path.join(srcDir, file))
    .rotate()
    .toBuffer({ resolveWithObject: true });
  let pipeline = sharp(upright.data);
  let source = { width: upright.info.width, height: upright.info.height };
  if (crop) {
    const [left, top, width, height] = crop;
    if (left + width > source.width || top + height > source.height) {
      throw new Error(`${file}: crop ${crop} outside ${source.width}x${source.height}`);
    }
    pipeline = pipeline.extract({ left, top, width, height });
    source = { width, height };
  }
  const width = Math.min(source.width * UPSCALE, MAX_WIDTH);
  pipeline = pipeline
    .resize({ width, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.7, m1: 0.6, m2: 1.2 });
  return { pipeline, source };
}

async function encodeWithinBudget(pipeline) {
  let result;
  for (let quality = QUALITY_START; quality >= QUALITY_FLOOR; quality -= QUALITY_STEP) {
    const { data, info } = await pipeline
      .clone()
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    result = { data, info, quality };
    if (data.length <= MAX_BYTES) break;
  }
  return result;
}

async function removeStrays(keep) {
  const removed = [];
  for (const file of await readdir(outDir)) {
    if (!keep.has(file)) {
      await rm(path.join(outDir, file));
      removed.push(file);
    }
  }
  return removed;
}

const sources = await resolveSources();
await mkdir(outDir, { recursive: true });

const manifest = {};
const oversize = [];
for (const image of sources) {
  const { pipeline, source } = await buildPipeline(image);
  const { data, info, quality } = await encodeWithinBudget(pipeline);
  const outFile = `${image.name}.webp`;
  await writeFile(path.join(outDir, outFile), data);
  manifest[image.name] = {
    src: `/images/${outFile}`,
    width: info.width,
    height: info.height,
    sourceWidth: source.width,
    bytes: data.length,
  };
  const kb = (data.length / 1024).toFixed(1);
  log(`${outFile.padEnd(34)} ${`${info.width}x${info.height}`.padEnd(10)} q${quality} ${kb} KB`);
  if (data.length > MAX_BYTES) oversize.push(`${outFile} (${kb} KB at q${quality})`);
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const removed = await removeStrays(new Set(sources.map((image) => `${image.name}.webp`)));
for (const file of removed) log(`removed stray ${file}`);

if (oversize.length > 0) {
  error(`over ${MAX_BYTES / 1024} KB at the quality floor:\n  ${oversize.join('\n  ')}`);
  process.exitCode = 1;
}
