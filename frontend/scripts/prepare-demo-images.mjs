// แปลงรูปเดโมใน frontend/img เป็น frontend/public/demo/<name>.webp
// รันซ้ำได้ ผลลัพธ์ byte-for-byte เดิมเสมอ และลบ webp ที่ไม่อยู่ในตารางทิ้ง
// ใช้: pnpm --filter @clinicq/frontend demo:images

import { error, log } from 'node:console';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const MAX_SIDE = 1600;
const STAFF_SIDE = 1000;
const MAX_BYTES = 250 * 1024;
const QUALITY_START = 80;
const QUALITY_FLOOR = 60;
const QUALITY_STEP = 5;

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(frontendDir, 'img');
const outDir = path.join(frontendDir, 'public', 'demo');

// square = กรอบครอปจัตุรัสเป็นพิกเซลของรูปต้นฉบับ (หลังหมุนตาม EXIF)
// ต้นฉบับกว้างแค่ 736px ครอปแล้วไม่ขยายกลับเป็น 1000 เพราะจะได้แค่ภาพเบลอที่ไฟล์ใหญ่ขึ้น
const IMAGES = [
  { name: 'hero', prefix: '24fdd3e2' },
  { name: 'space-1', prefix: 'b426f158' },
  { name: 'space-2', prefix: 'e8753658' },
  { name: 'space-3', prefix: 'cb0f1f00' },
  { name: 'space-4', prefix: '96ac1c26' },
  { name: 'space-5', prefix: '4e790a68' },
  { name: 'svc-facial-treatment', prefix: 'dadcabbc' },
  { name: 'svc-facial-cleansing', prefix: '7ec136b2' },
  { name: 'svc-face-massage', prefix: '7ecea3ac' },
  { name: 'svc-eye-care', prefix: '64910154' },
  { name: 'svc-hair-treatment', prefix: '1ddd5401' },
  { name: 'svc-wash-blowdry', prefix: '62b42005' },
  { name: 'svc-haircut', prefix: '33afed46' },
  { name: 'svc-consult', prefix: '7b94ca76' },
  { name: 'staff-nan', prefix: '5cf36190' },
  { name: 'staff-best', prefix: 'dc5bc364', square: { left: 336, top: 0, side: 400 } },
  { name: 'staff-fah', prefix: '62b42005', square: { left: 300, top: 60, side: 436 } },
  { name: 'review-1', prefix: 'f0367597' },
  { name: 'review-2', prefix: '80f9e13b' },
];

async function resolveSources() {
  const files = (await readdir(srcDir)).filter((file) => file.toLowerCase().endsWith('.jpg'));
  const problems = [];
  const resolved = IMAGES.map((image) => {
    const matches = files.filter((file) => file.startsWith(image.prefix));
    if (matches.length !== 1) {
      problems.push(
        `${image.name}: prefix ${image.prefix} matches ${matches.length} files ${JSON.stringify(matches)}`,
      );
    }
    return { ...image, file: matches[0] };
  });
  if (problems.length > 0) {
    throw new Error(`cannot resolve sources in ${srcDir}\n  ${problems.join('\n  ')}`);
  }
  return resolved;
}

function buildPipeline({ file, square }) {
  // rotate() ต้องมาก่อน extract() เพื่อให้พิกัดครอปอิงภาพที่ตั้งตรงแล้ว
  let pipeline = sharp(path.join(srcDir, file)).rotate();
  if (square) {
    pipeline = pipeline.extract({
      left: square.left,
      top: square.top,
      width: square.side,
      height: square.side,
    });
  }
  return pipeline.resize({
    width: square ? STAFF_SIDE : MAX_SIDE,
    height: square ? STAFF_SIDE : MAX_SIDE,
    fit: square ? 'cover' : 'inside',
    withoutEnlargement: true,
  });
}

async function encodeWithinBudget(pipeline) {
  let result;
  for (let quality = QUALITY_START; quality >= QUALITY_FLOOR; quality -= QUALITY_STEP) {
    const { data, info } = await pipeline
      .clone()
      .webp({ quality, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    result = { data, info, quality };
    if (data.length <= MAX_BYTES) break;
  }
  return result;
}

async function removeStrays(keep) {
  const removed = [];
  for (const file of await readdir(outDir)) {
    if (file.endsWith('.webp') && !keep.has(file)) {
      await rm(path.join(outDir, file));
      removed.push(file);
    }
  }
  return removed;
}

const sources = await resolveSources();
await mkdir(outDir, { recursive: true });

const oversize = [];
for (const image of sources) {
  const { data, info, quality } = await encodeWithinBudget(buildPipeline(image));
  const outFile = `${image.name}.webp`;
  await writeFile(path.join(outDir, outFile), data);
  const kb = (data.length / 1024).toFixed(1);
  log(`${outFile.padEnd(28)} ${`${info.width}x${info.height}`.padEnd(10)} q${quality} ${kb} KB`);
  if (data.length > MAX_BYTES) oversize.push(`${outFile} (${kb} KB at q${quality})`);
}

const removed = await removeStrays(new Set(sources.map((image) => `${image.name}.webp`)));
for (const file of removed) log(`removed stray ${file}`);

if (oversize.length > 0) {
  error(`over ${MAX_BYTES / 1024} KB at the quality floor:\n  ${oversize.join('\n  ')}`);
  process.exitCode = 1;
}
