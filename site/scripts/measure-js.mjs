// วัด JavaScript ที่หน้าเว็บโหลดตอนเปิดครั้งแรก (gzip) จากผล next build แล้วเทียบงบ 150 kB (แผน §6)
// ใช้: pnpm --filter @clinicq/site measure:js [-- --route /services/haircut] [-- --budget 150000]
//
// นับไฟล์ <script src> ทุกตัวใน HTML ที่ build ไว้ ยกเว้น noModule (เบราว์เซอร์ใหม่ไม่โหลด)
// ไฟล์ที่ dynamic import (โหลดเมื่อเลื่อนถึงหรือกด) ไม่อยู่ใน HTML จึงไม่ถูกนับ ซึ่งตรงกับสิ่งที่ผู้ใช้โหลดจริง
// gzip ระดับปริยายของ zlib (6) เท่ากับที่ next start บีบอัดส่งจริง
// สคริปต์ inline (ข้อมูล RSC ใน HTML) รายงานแยก ไม่นับในงบ เพราะเป็นข้อมูลหน้า ไม่ใช่โค้ด

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { error, log } from 'node:console';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextDir = path.join(siteDir, '.next');
const { values } = parseArgs({
  options: {
    route: { type: 'string', default: '/' },
    budget: { type: 'string', default: '150000' },
  },
});
const budget = Number(values.budget);

const route = values.route.replace(/\/$/, '') || '/';
const htmlFile = path.join(
  nextDir,
  'server',
  'app',
  route === '/' ? 'index.html' : `${route.slice(1)}.html`,
);
const html = await readFile(htmlFile, 'utf8').catch(() => {
  error(`ไม่พบ ${path.relative(siteDir, htmlFile)} รัน pnpm --filter @clinicq/site build ก่อน`);
  process.exit(2);
});

const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const external = [];
let inlineRaw = '';
for (const [, attrs, body] of tags) {
  const src = attrs.match(/\bsrc="([^"]+)"/)?.[1];
  if (!src) {
    if (!/type="application\/ld\+json"/.test(attrs)) inlineRaw += body;
    continue;
  }
  if (/\bnoModule\b/i.test(attrs)) continue;
  if (!external.includes(src)) external.push(src);
}

const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
const rows = [];
for (const src of external) {
  if (!src.startsWith('/_next/')) throw new Error(`script นอก /_next: ${src}`);
  const data = await readFile(path.join(nextDir, src.slice('/_next/'.length)));
  rows.push({ src, raw: data.length, gzip: gzipSync(data).length });
}
rows.sort((a, b) => b.gzip - a.gzip);

const total = rows.reduce((sum, row) => sum + row.gzip, 0);
const totalRaw = rows.reduce((sum, row) => sum + row.raw, 0);
log(`first-load JS ของ ${route} (${rows.length} ไฟล์)`);
for (const row of rows) {
  log(`  ${kB(row.gzip).padStart(9)} gzip  ${kB(row.raw).padStart(9)} raw  ${row.src}`);
}
log(`  ${'-'.repeat(9)}`);
log(`  ${kB(total).padStart(9)} gzip  ${kB(totalRaw).padStart(9)} raw  รวม`);
log(`inline script (ข้อมูล RSC ใน HTML ไม่นับในงบ): ${kB(gzipSync(inlineRaw).length)} gzip`);
log(`งบ ${kB(budget)}: ${total <= budget ? 'ผ่าน' : 'เกินงบ'}`);
process.exit(total <= budget ? 0 : 1);
