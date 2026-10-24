// ตรวจลิงก์ภายในของเว็บที่ build แล้ว (แผน S3: ลิงก์ภายในต้องไม่มีลิงก์เสีย)
// ใช้: pnpm --filter @clinicq/site check:links   (รันหลัง next build)
//
// ชุดหน้าที่มีจริง = HTML ทุกไฟล์ใน .next/server/app + route อื่นที่ build ไว้ (sitemap, robots, ภาพแชร์) + ไฟล์ใน public/
// ลิงก์ที่ตรวจ = ทุก URL ใน sitemap.xml + ทุก <a href> ในทุกหน้า รวมถึง #anchor ที่ต้องมี id อยู่ในหน้าปลายทาง
// ล้ม (exit 1) เมื่อ: ลิงก์ภายในชี้ไปหน้าที่ไม่มี, anchor ไม่มีในหน้า, sitemap มีหน้าที่ไม่มีจริง
// หรือมีหน้าที่ควรอยู่ใน sitemap แต่ไม่อยู่ (ยกเว้น /privacy และหน้า error ตามแผน §6)

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { error, log } from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(siteDir, '.next', 'server', 'app');
const publicDir = path.join(siteDir, 'public');
const NOT_IN_SITEMAP = new Set(['/privacy', '/_not-found', '/_global-error']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
  if (!entries) return [];
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return files.flat();
}

const toPosix = (file, root) => `/${path.relative(root, file).split(path.sep).join('/')}`;

const appFiles = await walk(appDir);
const pages = new Map();
const otherRoutes = new Set();
for (const file of appFiles) {
  const rel = toPosix(file, appDir);
  if (rel.endsWith('.html')) {
    const route = rel === '/index.html' ? '/' : rel.slice(0, -'.html'.length);
    pages.set(route, await readFile(file, 'utf8'));
  } else if (rel.endsWith('.body')) {
    otherRoutes.add(rel.slice(0, -'.body'.length));
  }
}
if (pages.size === 0) {
  error('ไม่พบ HTML ใน .next/server/app รัน pnpm --filter @clinicq/site build ก่อน');
  process.exit(2);
}
const publicFiles = new Set((await walk(publicDir)).map((file) => toPosix(file, publicDir)));

const sitemap = await readFile(path.join(appDir, 'sitemap.xml.body'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const origin = new URL(locs[0]).origin;

const decode = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<');
const normalize = (pathname) => decodeURIComponent(pathname.replace(/(.)\/$/, '$1'));
const exists = (pathname) =>
  pages.has(pathname) || otherRoutes.has(pathname) || publicFiles.has(pathname);
const hasId = (html, id) => html.includes(`id="${id}"`);

const problems = [];
const external = new Map();
let checked = 0;

for (const loc of locs) {
  const url = new URL(loc);
  if (url.origin !== origin) problems.push(`sitemap: ${loc} อยู่นอกเว็บ`);
  else if (!pages.has(normalize(url.pathname))) problems.push(`sitemap: ${loc} ไม่มีหน้านี้`);
}
const inSitemap = new Set(locs.map((loc) => normalize(new URL(loc).pathname)));
for (const route of pages.keys()) {
  if (!NOT_IN_SITEMAP.has(route) && !inSitemap.has(route)) problems.push(`sitemap: ไม่มี ${route}`);
}

for (const [route, html] of pages) {
  const base = new URL(route, origin);
  for (const match of html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
    const href = decode(match[1]);
    if (/^(mailto|tel):/.test(href)) continue;
    const url = new URL(href, base);
    if (url.origin !== origin) {
      external.set(url.origin, (external.get(url.origin) ?? 0) + 1);
      continue;
    }
    checked += 1;
    const target = normalize(url.pathname);
    if (!exists(target)) {
      problems.push(`${route}: ลิงก์เสีย ${href}`);
      continue;
    }
    const id = url.hash.slice(1);
    if (id && pages.has(target) && !hasId(pages.get(target), decodeURIComponent(id))) {
      problems.push(`${route}: ไม่มี #${id} ในหน้า ${target}`);
    }
  }
}

log(`หน้า HTML ${pages.size} หน้า · URL ใน sitemap ${locs.length} · ลิงก์ภายในที่ตรวจ ${checked}`);
for (const [host, count] of external) log(`  ลิงก์ออกนอกเว็บ (ไม่ตรวจ) ${host}: ${count}`);
if (problems.length > 0) {
  error(`พบปัญหา ${problems.length} ข้อ:`);
  for (const problem of [...new Set(problems)]) error(`  - ${problem}`);
  process.exit(1);
}
log('ไม่มีลิงก์ภายในเสีย sitemap ครบทุกหน้า');
