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

/**
 * คอร์สที่ร้านขาย — Phase 6
 *
 * ผูกกับบริการที่มีอยู่แล้ว เพื่อให้หน้านัดเลือก "ตัดครั้งจากคอร์ส" ได้ตรงกับบริการที่จอง
 */
const COURSE_PACKAGES = [
  {
    name: 'คอร์สทรีตเมนต์ผิวหน้า 10 ครั้ง',
    serviceName: 'ทรีตเมนต์บำรุงผิวหน้า',
    totalSessions: 10,
    validDays: 180,
    price: 12000,
  },
  {
    name: 'คอร์สดูแลเส้นผม 6 ครั้ง',
    serviceName: 'ทรีตเมนต์บำรุงผม',
    totalSessions: 6,
    validDays: 120,
    price: 11000,
  },
  {
    name: 'คอร์สนวดหน้าผ่อนคลาย 5 ครั้ง',
    serviceName: 'นวดหน้าผ่อนคลาย',
    totalSessions: 5,
    validDays: 90,
    price: 2500,
  },
];

/**
 * คอร์สที่ลูกค้าซื้อไปแล้ว — จงใจให้มีทั้งสามกลุ่มที่ระบบต้องแยกให้ออก
 *
 * - ใกล้หมดอายุและยังมีครั้งเหลือ  → ต้องขึ้นในลิสต์ที่ร้านควรโทรตาม และได้รับข้อความเตือน
 * - หมดอายุแล้วทั้งที่ยังมีครั้งเหลือ → ปัญหาที่ระบบนี้มีไว้กัน (เงินที่กลายเป็นข้อร้องเรียน)
 * - ใช้ครบแล้ว                      → ต้องไม่ถูกทวง แม้วันหมดอายุจะใกล้แค่ไหน
 *
 * daysToExpiry ติดลบ = หมดอายุไปแล้วกี่วัน
 */
const COURSE_PURCHASES = [
  // ใกล้หมดอายุและยังมีครั้งเหลือ — 4 ใบ
  { phone: '0810000001', package: 0, daysToExpiry: 9, usedSessions: 6 },
  { phone: '0810000002', package: 1, daysToExpiry: 17, usedSessions: 3 },
  { phone: '0810000005', package: 2, daysToExpiry: 24, usedSessions: 1 },
  { phone: '0810000008', package: 0, daysToExpiry: 29, usedSessions: 4 },

  // หมดอายุไปแล้วทั้งที่ยังใช้ไม่ครบ — 2 ใบ
  { phone: '0810000014', package: 0, daysToExpiry: -20, usedSessions: 3 },
  { phone: '0810000016', package: 2, daysToExpiry: -55, usedSessions: 1 },

  // ยังมีเวลาเหลืออีกนาน
  { phone: '0810000003', package: 0, daysToExpiry: 120, usedSessions: 2 },
  { phone: '0810000004', package: 1, daysToExpiry: 95, usedSessions: 1 },
  { phone: '0810000006', package: 0, daysToExpiry: 150, usedSessions: 0 },
  { phone: '0810000007', package: 2, daysToExpiry: 60, usedSessions: 2 },
  { phone: '0810000009', package: 1, daysToExpiry: 88, usedSessions: 4 },
  { phone: '0810000010', package: 0, daysToExpiry: 170, usedSessions: 1 },

  // ใช้ครบทุกครั้งแล้ว — ใกล้หมดอายุแค่ไหนก็ต้องไม่ถูกทวง
  { phone: '0810000011', package: 2, daysToExpiry: 12, usedSessions: 5 },
  { phone: '0810000012', package: 0, daysToExpiry: 21, usedSessions: 10 },
  { phone: '0810000013', package: 1, daysToExpiry: 40, usedSessions: 6 },
];

/** แคมเปญดึงลูกค้ากลับ — Phase 6 */
const CAMPAIGN = {
  name: 'ดึงลูกค้าที่หายไป — ส่วนลด 15%',
  message:
    '💌 คิดถึงคุณ {name} จังเลยค่ะ\n' +
    'ไม่ได้เจอกันนานแล้ว THNP Clinic มีส่วนลดพิเศษ 15% สำหรับคุณโดยเฉพาะ ถึงสิ้นเดือนนี้\n' +
    'ทักแชทนี้เพื่อจองคิวได้เลยค่ะ',
  inactiveDays: 90,
};

/**
 * รอบที่เคยส่งไปแล้วของแคมเปญ — ส่ง 12 กลับมา 4 รายได้ 6,800 บาท
 *
 * ใส่ไว้เพื่อให้หน้าวัดผล ROI มีเรื่องเล่าตั้งแต่วันแรกที่เปิดเดโม ไม่ใช่หน้าว่างที่ต้องรอ
 * ให้ลูกค้าจินตนาการเอาเอง — ตัวเลขชุดนี้คือสไลด์ที่ใช้ปิดการขาย
 */
const CAMPAIGN_RUNS: {
  phone: string;
  sentDaysAgo: number;
  /** ไม่ระบุ = ยังไม่กลับมา */
  returnedDaysAgo?: number;
  revenue?: number;
}[] = [
  { phone: '0810000011', sentDaysAgo: 40, returnedDaysAgo: 33, revenue: 1500 },
  { phone: '0810000012', sentDaysAgo: 40, returnedDaysAgo: 28, revenue: 2200 },
  { phone: '0810000013', sentDaysAgo: 40, returnedDaysAgo: 21, revenue: 2200 },
  { phone: '0810000014', sentDaysAgo: 40, returnedDaysAgo: 12, revenue: 900 },
  { phone: '0810000015', sentDaysAgo: 40 },
  { phone: '0810000016', sentDaysAgo: 40 },
  { phone: '0810000001', sentDaysAgo: 40 },
  { phone: '0810000002', sentDaysAgo: 40 },
  { phone: '0810000003', sentDaysAgo: 40 },
  { phone: '0810000004', sentDaysAgo: 40 },
  { phone: '0810000005', sentDaysAgo: 40 },
  { phone: '0810000018', sentDaysAgo: 40 },
];

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
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

  // ── คอร์ส (Phase 6) ──────────────────────────────────────

  const packageIds: string[] = [];

  for (const pkg of COURSE_PACKAGES) {
    const service = await prisma.service.findFirst({ where: { name: pkg.serviceName } });
    const data = {
      name: pkg.name,
      serviceId: service?.id ?? null,
      totalSessions: pkg.totalSessions,
      validDays: pkg.validDays,
      price: pkg.price,
    };

    const existing = await prisma.coursePackage.findFirst({ where: { name: pkg.name } });
    const saved = existing
      ? await prisma.coursePackage.update({ where: { id: existing.id }, data })
      : await prisma.coursePackage.create({ data });

    packageIds.push(saved.id);
  }
  console.log(`คอร์สที่ขาย    ${COURSE_PACKAGES.length} แบบ`);

  for (const purchase of COURSE_PURCHASES) {
    const customer = await prisma.customer.findUnique({ where: { phone: purchase.phone } });
    const packageId = packageIds[purchase.package];
    if (!customer) continue;

    // ซื้อเมื่อไหร่ย้อนกลับจากวันหมดอายุที่อยากให้เป็น เพื่อให้เดโมมีเคสครบทุกกลุ่มเสมอ
    const expiresAt = daysFromNow(purchase.daysToExpiry);
    const purchasedAt = new Date(
      expiresAt.getTime() - COURSE_PACKAGES[purchase.package].validDays * 86_400_000,
    );

    const existing = await prisma.customerCourse.findFirst({
      where: { customerId: customer.id, packageId },
    });

    if (existing) continue;

    await prisma.customerCourse.create({
      data: {
        customerId: customer.id,
        packageId,
        usedSessions: purchase.usedSessions,
        purchasedAt,
        expiresAt,
      },
    });
  }
  console.log(`คอร์สที่ขายไป  ${COURSE_PURCHASES.length} ใบ`);

  // ── แคมเปญดึงลูกค้ากลับ (Phase 6) ────────────────────────

  const existingCampaign = await prisma.campaign.findFirst({ where: { name: CAMPAIGN.name } });
  const campaign = existingCampaign
    ? await prisma.campaign.update({ where: { id: existingCampaign.id }, data: CAMPAIGN })
    : await prisma.campaign.create({ data: CAMPAIGN });

  for (const run of CAMPAIGN_RUNS) {
    const customer = await prisma.customer.findUnique({ where: { phone: run.phone } });
    if (!customer) continue;

    await prisma.campaignRun.upsert({
      where: { campaignId_customerId: { campaignId: campaign.id, customerId: customer.id } },
      update: {},
      create: {
        campaignId: campaign.id,
        customerId: customer.id,
        sentAt: daysAgo(run.sentDaysAgo),
        returnedAt: run.returnedDaysAgo === undefined ? null : daysAgo(run.returnedDaysAgo),
        revenue: run.revenue ?? null,
      },
    });
  }

  const returned = CAMPAIGN_RUNS.filter((run) => run.returnedDaysAgo !== undefined);
  const campaignRevenue = returned.reduce((sum, run) => sum + (run.revenue ?? 0), 0);
  console.log(
    `แคมเปญ         ส่ง ${CAMPAIGN_RUNS.length} · กลับมา ${returned.length} · ` +
      `รายได้ ${campaignRevenue.toLocaleString('th-TH')} บาท`,
  );

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
