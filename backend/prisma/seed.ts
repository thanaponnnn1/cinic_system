/**
 * ข้อมูลตั้งต้นสำหรับ THNP Clinic (เดโม)
 *
 * รันด้วย: pnpm --filter @clinicq/backend db:seed
 *
 * ข้อมูลทุกอย่างในไฟล์นี้เป็นข้อมูลสมมติทั้งหมด ไม่มีบุคคลจริง
 * แต่จงใจให้ "มีเรื่องราว" — มีทั้งคนที่ผูก LINE แล้วและยังไม่ผูก มีทั้งคนที่ให้ความยินยอม
 * และไม่ให้ มีทั้งลูกค้าประจำและลูกค้าที่หายไปนาน เพื่อให้ทุกฟีเจอร์มีเคสทดสอบตั้งแต่วันแรก
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
const prisma = new PrismaClient({ adapter });

/** รหัสผ่านเดียวกันทุกบัญชีเดโม — ของจริงตอนส่งมอบต้องเปลี่ยนทั้งหมด */
const DEMO_PASSWORD = 'demo1234';

const USERS = [
  {
    email: 'owner@thnpclinic.com',
    name: 'คุณธนพร (เจ้าของร้าน)',
    role: 'ADMIN' as const,
  },
  {
    email: 'staff@thnpclinic.com',
    name: 'คุณมิ้นท์ (พนักงานต้อนรับ)',
    role: 'STAFF' as const,
  },
  {
    email: 'demo@thnpclinic.com',
    name: 'บัญชีสำหรับดูอย่างเดียว',
    role: 'VIEWER' as const,
  },
];

const PROVIDERS = [
  { name: 'คุณแนน', title: 'ช่างผู้เชี่ยวชาญ' },
  { name: 'คุณเบส', title: 'ช่างอาวุโส' },
  { name: 'คุณฟ้า', title: 'ช่าง' },
];

const SERVICES = [
  { name: 'ทรีตเมนต์บำรุงผิวหน้า', durationMin: 60, price: 1500 },
  { name: 'ทำความสะอาดผิวหน้า', durationMin: 45, price: 900 },
  { name: 'นวดหน้าผ่อนคลาย', durationMin: 30, price: 600 },
  { name: 'ดูแลผิวรอบดวงตา', durationMin: 30, price: 800 },
  { name: 'ทรีตเมนต์บำรุงผม', durationMin: 90, price: 2200 },
  { name: 'สระไดร์', durationMin: 45, price: 450 },
  { name: 'ตัดแต่งทรงผม', durationMin: 60, price: 800 },
  { name: 'ปรึกษาและวางแผนการดูแล', durationMin: 30, price: 0 },
];

/**
 * ลูกค้า 20 ราย แบ่งกลุ่มให้ครอบคลุมทุกเคสที่ระบบต้องรับมือ:
 * - ผูก LINE + ยินยอมครบ → ได้รับข้อความทุกชนิด
 * - ผูก LINE แต่ยินยอมแค่เตือนนัด → ต้องไม่ได้รับข้อความการตลาด
 * - ยังไม่ผูก LINE → ส่งไม่ได้ ต้องขึ้นเป็น SKIPPED_NO_LINE
 * - ไม่ยินยอมเลย → ต้องไม่ได้รับอะไรเลย
 * - หายไปเกิน 90 วัน → เข้าเกณฑ์แคมเปญตามกลับ
 */
const CUSTOMERS = [
  // มาประจำ ผูก LINE แล้ว ยินยอมครบ
  {
    name: 'สมหญิง ใจดี',
    phone: '0810000001',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 7,
  },
  {
    name: 'ปิยะดา วงศ์สว่าง',
    phone: '0810000002',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 14,
  },
  {
    name: 'กมลชนก แสงทอง',
    phone: '0810000003',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 21,
  },
  {
    name: 'ณัฐธิดา ศรีสุข',
    phone: '0810000004',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 30,
  },

  // ยินยอมเฉพาะเตือนนัด — ห้ามส่งข้อความการตลาดหาคนกลุ่มนี้
  {
    name: 'อารียา พูลสุข',
    phone: '0810000005',
    line: true,
    reminder: true,
    marketing: false,
    lastVisitDaysAgo: 10,
  },
  {
    name: 'ชนิดา ทองมี',
    phone: '0810000006',
    line: true,
    reminder: true,
    marketing: false,
    lastVisitDaysAgo: 45,
  },
  {
    name: 'พรทิพย์ มั่นคง',
    phone: '0810000007',
    line: true,
    reminder: true,
    marketing: false,
    lastVisitDaysAgo: 120,
  },

  // ยังไม่ผูก LINE — ส่งข้อความไม่ได้แม้จะยินยอมแล้ว
  {
    name: 'สุภาพร ดีงาม',
    phone: '0810000008',
    line: false,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 5,
  },
  {
    name: 'มาลี รุ่งเรือง',
    phone: '0810000009',
    line: false,
    reminder: true,
    marketing: false,
    lastVisitDaysAgo: 60,
  },
  {
    name: 'วิภาวี จันทร์เพ็ญ',
    phone: '0810000010',
    line: false,
    reminder: false,
    marketing: false,
    lastVisitDaysAgo: 95,
  },

  // ไม่ยินยอมเลย — ต้องไม่ได้รับข้อความใดทั้งสิ้น
  {
    name: 'ธนพร เกษมสุข',
    phone: '0810000011',
    line: true,
    reminder: false,
    marketing: false,
    lastVisitDaysAgo: 18,
  },
  {
    name: 'จิราภรณ์ สุขใจ',
    phone: '0810000012',
    line: false,
    reminder: false,
    marketing: false,
    lastVisitDaysAgo: 200,
  },

  // หายไปเกิน 3 เดือน — กลุ่มเป้าหมายของแคมเปญตามกลับ
  {
    name: 'ศิริพร บุญมา',
    phone: '0810000013',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 100,
  },
  {
    name: 'นภัสสร ไพศาล',
    phone: '0810000014',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 135,
  },
  {
    name: 'อรวรรณ พิพัฒน์',
    phone: '0810000015',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 180,
  },
  {
    name: 'เบญจมาศ คงทน',
    phone: '0810000016',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 240,
  },
  {
    name: 'ทิพวรรณ ศรีทอง',
    phone: '0810000017',
    line: false,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: 150,
  },

  // ลูกค้าใหม่ ยังไม่เคยมา
  {
    name: 'ปวีณา สมบูรณ์',
    phone: '0810000018',
    line: true,
    reminder: true,
    marketing: true,
    lastVisitDaysAgo: null,
  },
  {
    name: 'รัตนา วัฒนา',
    phone: '0810000019',
    line: false,
    reminder: true,
    marketing: false,
    lastVisitDaysAgo: null,
  },
  {
    name: 'สุดารัตน์ พรหมมา',
    phone: '0810000020',
    line: false,
    reminder: false,
    marketing: false,
    lastVisitDaysAgo: null,
  },
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

async function main(): Promise<void> {
  console.log('เริ่มใส่ข้อมูลตั้งต้น...\n');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      // ไม่ทับรหัสผ่านของบัญชีที่มีอยู่แล้ว เผื่อมีคนเปลี่ยนไว้ระหว่างทดสอบ
      update: { name: user.name, role: user.role },
      create: { ...user, passwordHash },
    });
  }
  console.log(`ผู้ใช้ฝั่งร้าน  ${USERS.length} บัญชี`);

  for (const provider of PROVIDERS) {
    const existing = await prisma.provider.findFirst({ where: { name: provider.name } });
    if (existing) {
      await prisma.provider.update({ where: { id: existing.id }, data: provider });
    } else {
      await prisma.provider.create({ data: provider });
    }
  }
  console.log(`ช่าง           ${PROVIDERS.length} คน`);

  for (const service of SERVICES) {
    const existing = await prisma.service.findFirst({ where: { name: service.name } });
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: service });
    } else {
      await prisma.service.create({ data: service });
    }
  }
  console.log(`บริการ         ${SERVICES.length} รายการ`);

  for (const [index, c] of CUSTOMERS.entries()) {
    const hasConsent = c.reminder || c.marketing;
    await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: {
        name: c.name,
        phone: c.phone,
        // ใช้รูปแบบ userId ปลอมที่ดูเหมือนของจริง จะได้เห็นว่าคอลัมน์นี้ถูกใช้งานยังไง
        lineUserId: c.line ? `U${String(index + 1).padStart(4, '0')}demoseeduserid` : null,
        consentReminder: c.reminder,
        consentMarketing: c.marketing,
        consentAt: hasConsent ? daysAgo(300) : null,
        lastVisitAt: c.lastVisitDaysAgo === null ? null : daysAgo(c.lastVisitDaysAgo),
      },
    });
  }

  const withLine = CUSTOMERS.filter((c) => c.line).length;
  const inactive90 = CUSTOMERS.filter(
    (c) => c.lastVisitDaysAgo === null || c.lastVisitDaysAgo > 90,
  ).length;

  console.log(`ลูกค้า         ${CUSTOMERS.length} ราย`);
  console.log(`  ผูก LINE แล้ว           ${withLine} ราย`);
  console.log(`  ยินยอมรับการตลาด        ${CUSTOMERS.filter((c) => c.marketing).length} ราย`);
  console.log(`  หายเกิน 90 วัน          ${inactive90} ราย  (กลุ่มเป้าหมายแคมเปญตามกลับ)`);

  console.log('\nบัญชีสำหรับเข้าสู่ระบบ (รหัสผ่านเดียวกันทุกบัญชี)');
  console.log('┌────────────────────────────┬──────────────┬────────────┐');
  console.log('│ อีเมล                      │ รหัสผ่าน      │ สิทธิ์      │');
  console.log('├────────────────────────────┼──────────────┼────────────┤');
  for (const u of USERS) {
    console.log(`│ ${u.email.padEnd(26)} │ ${DEMO_PASSWORD.padEnd(12)} │ ${u.role.padEnd(10)} │`);
  }
  console.log('└────────────────────────────┴──────────────┴────────────┘');
  console.log('\nเสร็จเรียบร้อย');
}

main()
  .catch((error: unknown) => {
    console.error('ใส่ข้อมูลตั้งต้นไม่สำเร็จ:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
