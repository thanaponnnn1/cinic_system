# THNP ClinicQ — แผนสร้าง Demo ระบบคลินิก / ร้านเสริมสวย

**ระบบนัดหมาย + ดูแลลูกค้า ผ่าน LINE OA** · โปรเจกต์ผลงานสำหรับขายงานกลุ่มที่ 13 (use-cases.md) · thanapon.ji · ส.ค. 2026

> **เอกสารนี้คืออะไร** — แผนลงมือทำแบบวันต่อวัน 21 วัน สำหรับสร้างระบบจริงที่ deploy ขึ้นคลาวด์ ใช้เป็นผลงานปิดการขายลูกค้าคลินิก/ร้านเสริมสวย และเป็นโครงที่หยิบไปส่งมอบลูกค้าจริงได้ทันที (ช่วงราคาขาย 9,900 – 19,900 ตาม use-cases.md ข้อ 13)

> ✅ **Phase 0 เสร็จแล้ว** (30 ส.ค. 2569) — โครง monorepo, ฐานข้อมูล, health endpoint และ dashboard หน้าแรกทำงานจริงแล้ว
> ดูวิธีรันได้ที่ [README.md](../README.md) · รายละเอียดสิ่งที่เปลี่ยนจากแผนเดิมอยู่ท้าย Phase 0

> 📌 **ขอบเขตของแผนนี้** — โปรเจกต์ PriceRadar ถูกตัดออกจากแผนแล้ว ทุ่มเวลาให้ ClinicQ ตัวเดียว

---

## สารบัญ

- [1. โปรเจกต์นี้พิสูจน์อะไร](#1-โปรเจกต์นี้พิสูจน์อะไร)
- [2. การตัดสินใจที่ล็อกแล้ว](#2-การตัดสินใจที่ล็อกแล้ว)
- [3. ขอบเขต MVP — 4 ตัวทำเงิน](#3-ขอบเขต-mvp--4-ตัวทำเงิน)
- [4. โครงสร้างข้อมูล](#4-โครงสร้างข้อมูล)
- [5. API ที่จะมีทั้งหมด](#5-api-ที่จะมีทั้งหมด)
- [6. แผนราย Phase](#6-แผนราย-phase)
- [7. ข้อความ LINE ที่จะส่งจริง](#7-ข้อความ-line-ที่จะส่งจริง)
- [8. ของที่ต้องเตรียม](#8-ของที่ต้องเตรียม)
- [9. Checklist ผลงานที่ต้องเก็บ](#9-checklist-ผลงานที่ต้องเก็บ)
- [10. PDPA + ความเสี่ยง + แพ็กเกจขายจริง](#10-pdpa--ความเสี่ยง--แพ็กเกจขายจริง)
- [11. สิ่งที่ไม่ทำใน demo นี้](#11-สิ่งที่ไม่ทำใน-demo-นี้)

---

## 1. โปรเจกต์นี้พิสูจน์อะไร

ลูกค้ากลุ่มนี้ (เจ้าของคลินิก/ร้านเสริมสวย) ไม่ได้ซื้อ "ระบบ" — เขาซื้อ **เงินที่หายไปกลับคืนมา** จาก 3 รู: คิวที่โดนเทเพราะลูกค้าลืมนัด · ลูกค้าเก่าที่หายไปเงียบๆ · คอร์สที่ขายแล้วหมดอายุโดยไม่ได้ใช้ (= เงินที่รับมาแล้วแต่กลายเป็นปัญหา)

ทุกฟีเจอร์ใน demo นี้ถูกเลือกมาเพราะแมปตรงกับประโยคขายใน use-cases.md ข้อ 13:

| ประโยคขาย                                                            | ส่วนที่พิสูจน์มันใน demo                              |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| "เตือนนัดล่วงหน้า 1 วัน และซ้ำอีกครั้งก่อน 2 ชั่วโมง"                | Reminder Scheduler (Phase 4)                          |
| **"ให้ลูกค้ากดยืนยันหรือขอเลื่อนนัดผ่าน LINE ได้เลย"**               | Flex Message + postback → สถานะเปลี่ยนสด (Phase 3)    |
| **"เมื่อมีคนยกเลิก → ส่งคิวว่างให้ลูกค้าที่รออยู่ทันที"**            | Waitlist Engine (Phase 5) ← ฟีเจอร์เดโมสดที่แรงสุด    |
| **"ติดตามลูกค้าที่ไม่มาเกิน 3 เดือน แล้วส่งโปรดึงกลับ"** ← ทำเงินสุด | Win-back Campaign + หน้าวัดผล ROI (Phase 6)           |
| "เตือนคอร์สที่ซื้อไว้ใกล้หมดอายุ ทั้งฝั่งลูกค้าและฝั่งร้าน"          | Course Expiry Cron (Phase 6)                          |
| "สรุปรายได้และจำนวนเคสรายวัน/รายช่าง"                                | Dashboard สรุปรายวัน (Phase 7)                        |
| "ต้องแบ่งสิทธิ์ผู้ใช้ให้ชัด" (ข้อกำหนด PDPA)                         | RBAC 3 ระดับ + หน้า consent + MessageLog (Phase 1, 7) |
| "แจ้งเตือนเมื่อระบบตัวเองพัง" (จุดต่างของคุณทุกงาน)                  | Heartbeat + Dead-man switch + Failure alert (Phase 8) |

### จุดต่าง 2 ข้อที่คู่แข่งในตลาดไม่ทำ

**1. ลูกค้ากดตอบกลับได้ ไม่ใช่แค่รับข้อความ** — ระบบเตือนนัดทั่วไปส่งข้อความทางเดียวจบ ของเราลูกค้ากด "✅ ยืนยัน" หรือ "🔄 ขอเลื่อน" ในแชท แล้วสถานะบนจอของร้านเปลี่ยน**ทันที** — นี่คือท่อนเดโมที่ปิดการขาย เพราะเจ้าของร้านเห็นภาพว่าเช้าวันหนึ่งเขาจะเปิดจอแล้วรู้เลยว่าคิวไหนมาแน่ คิวไหนเสี่ยง

**2. PDPA เป็นหน้าจอจริง ไม่ใช่แค่คำพูด** — use-cases.md ระบุว่ากลุ่มนี้คือข้อมูลอ่อนไหวที่สุดในเอกสาร (ข้อมูลสุขภาพ) demo นี้จึงทำให้เห็นจับต้องได้: หน้า consent รายลูกค้าพร้อมวันที่ให้ความยินยอม · ทุกข้อความไม่มีรายละเอียดการรักษา · สิทธิ์ VIEWER เห็นตารางนัดแต่ไม่เห็นเบอร์โทร · MessageLog บันทึกว่าข้อความไหน**ไม่ถูกส่ง**เพราะไม่มี consent — พูดกับเจ้าของคลินิกได้เต็มปากว่า "ระบบนี้ปกป้องคุณจากความเสี่ยงทางกฎหมายด้วย" ซึ่งเป็นประโยคที่ freelance ทั่วไปพูดไม่ได้

### แบรนด์ที่ใช้ในเดโม

เดโมนี้ใช้แบรนด์ **THNP Clinic — Aesthetics & Wellness** (โลโก้ทองบนพื้นกรมท่า) เป็นร้านตัวอย่าง

สีทั้งชุดสุ่มวัดมาจากไฟล์โลโก้จริง ไม่ใช่สีที่เดาเอง แล้วเก็บไว้ที่เดียวใน `shared/src/brand.ts` — ทั้งหน้าจอ dashboard และ LINE Flex Message ดึงจากแหล่งเดียวกัน ทำให้สีในแชทกับสีบนจอเป็นชุดเดียวกันเป๊ะ ซึ่งเป็นรายละเอียดที่ลูกค้ารู้สึกได้ว่า "ทำมาอย่างดี" แม้จะบอกไม่ถูกว่าเพราะอะไร

| บทบาท         | ค่า       | ที่มาในโลโก้                |
| ------------- | --------- | --------------------------- |
| ทองหลัก       | `#D3BC88` | ค่าเฉลี่ยของเส้นทองทั้งโลโก้ |
| ทองไฮไลต์     | `#FCF1C4` | จุดสว่างที่สุดบนเส้นทอง      |
| ทองเงา        | `#967A4B` | จุดเข้มที่สุดบนเส้นทอง       |
| กรมท่าหลัก    | `#142132` | ค่าเฉลี่ยพื้นหลัง            |
| กรมท่าเข้มสุด | `#060D15` | จุดเข้มที่สุดของพื้นหลัง     |

---

## 2. การตัดสินใจที่ล็อกแล้ว

| หัวข้อ            | เลือก                                                    | เหตุผล                                                                                                                                          |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend           | **NestJS 11 + TypeScript 5.9 (CommonJS)**                | module structure ทำให้ลูกค้าเห็นว่าเป็นระบบ ไม่ใช่สคริปต์ — **ยังไม่ขยับไป NestJS 12 เพราะเป็น ESM อย่างเดียว** (เหตุผลเต็มอยู่ท้าย Phase 0)     |
| ORM / DB          | **Prisma 7 + PostgreSQL 17**                             | ตารางนัดต้อง query ช่วงเวลา + กันจองซ้อนด้วย constraint ระดับ DB · Prisma 7 ต่อฐานข้อมูลผ่าน driver adapter (`@prisma/adapter-pg`)              |
| Queue / Scheduler | **BullMQ + Redis**                                       | เตือนนัดคือ delayed job รายนัด (ไม่ใช่ cron กวาดทุกนาที) ต้องมี retry + กันส่งซ้ำ                                                               |
| ฝั่งลูกค้า        | **LINE OA อย่างเดียว — ไม่ทำ LIFF ไม่ทำแอป**             | ปุ่ม postback ใน Flex Message ทำครบทุก flow ที่ MVP ต้องการ เดโมแรงกว่าและตัดเวลา dev ไปหลายวัน — LIFF เก็บไว้เป็นของขายเฟส 2 (ดูประวัติ/จองเอง) |
| ผูกตัวตนลูกค้า    | **รหัสเชื่อม 6 หลัก**                                    | พนักงานกดสร้างรหัสจาก dashboard → ลูกค้าพิมพ์รหัสในแชท LINE OA → ระบบผูก `lineUserId` เข้ากับ Customer — ง่ายสุดสำหรับหน้าร้านจริง              |
| แจ้งเตือน         | **LINE Messaging API** (Flex Message + postback)         | ห้ามใช้คำว่า LINE Notify — ปิดบริการไปแล้ว (ตามที่แก้ไว้ใน fastwork-gig-2-3-4.md)                                                               |
| Frontend          | **Next.js 16 (App Router) + Tailwind CSS 4**             | dashboard สำหรับพนักงาน/เจ้าของร้าน — แยกโฟลเดอร์ชัดเพื่อโชว์ได้ว่า API ใช้งานจากภายนอกได้จริง                                                  |
| Auth              | **JWT login + RBAC 3 ระดับ (ADMIN / STAFF / VIEWER)**    | การแบ่งสิทธิ์คือข้อกำหนด PDPA ตรงๆ จาก use-cases.md — และเป็นจุดขาย                                                                             |
| **Demo Time Machine** | **endpoint จำลองเวลา + ปุ่มบน dashboard**            | เตือนนัด T-1 วัน ถ้าเดโมจริงต้องรอข้ามวัน — ปุ่มนี้เลื่อนเวลาระบบให้ job ยิงต่อหน้าลูกค้าได้เลย เปิดเฉพาะ `DEMO_MODE=true` ปิดตายใน production |
| Deploy            | **Railway Hobby (~$5/เดือน) + Vercel (dashboard)**       | worker เตือนนัดต้องตื่น 24 ชม. ซึ่งขัดกับ free tier ส่วนใหญ่ที่หลับเมื่อไม่มีคนใช้ — ถ้าเลือกผิด งานเตือนนัดจะไม่ยิงและกว่าจะรู้ก็สายไปแล้ว     |
| ระยะเวลา          | **21 วัน × 2–3 ชม./วัน**                                 | หมุดใหญ่ 3 จุด: วันที่ 10 (กดปุ่มใน LINE แล้วจอเปลี่ยน) · วันที่ 15 (ครบ 4 ตัวทำเงิน) · วันที่ 20 (ขึ้นคลาวด์)                                  |

---

## 3. ขอบเขต MVP — 4 ตัวทำเงิน

เรียงตามลำดับที่เดโมให้ลูกค้าดู (เจ็บสุด → ว้าวสุด):

### 3.1 เตือนนัด + กดยืนยัน/ขอเลื่อนผ่าน LINE

- สร้างนัดจาก dashboard → ระบบตั้ง reminder job อัตโนมัติ 2 จุด: **ล่วงหน้า 1 วัน** และ **ก่อนถึงเวลา 2 ชั่วโมง**
- ข้อความเป็น Flex Message มีปุ่ม `✅ ยืนยันนัด` / `🔄 ขอเลื่อนนัด`
- กดยืนยัน → นัดเปลี่ยนเป็น `CONFIRMED` เห็นสีเปลี่ยนบนบอร์ดคิวทันที
- กดขอเลื่อน → นัดเปลี่ยนเป็น `RESCHEDULE_REQUESTED` + เด้งแจ้งพนักงานให้โทรกลับนัดเวลาใหม่ (MVP ไม่ให้ลูกค้าเลือกเวลาเองในแชท — ตัดความซับซ้อนเรื่องตารางว่างออกไปเฟส 2)
- นัดที่เลยเวลาแล้วไม่มา → พนักงานกด `NO_SHOW` หนึ่งคลิก — ตัวเลข no-show คือข้อมูลที่ระบบเอาไปโชว์ว่า "เดือนนี้ช่วยกู้คิวไปกี่คิว"

### 3.2 คิวว่าง → Waitlist

- ลูกค้าที่จองไม่ได้เพราะคิวเต็ม พนักงานกดเพิ่มเข้า waitlist (เลือกช่วงวัน/เวลาที่ลูกค้าสะดวก)
- เมื่อมีนัดถูกยกเลิก → ระบบหาคนใน waitlist ที่ช่วงเวลาตรงกัน แล้ว push Flex "มีคิวว่าง [วัน เวลา] สนใจกด 👇" หาทุกคนที่เข้าเกณฑ์
- **คนแรกที่กดได้คิว** — จองผ่าน transaction กันกดแย่งพร้อมกัน คนที่กดช้าได้ข้อความ "ขออภัย คิวนี้มีผู้จองแล้ว"
- นี่คือประโยค "เปลี่ยนช่องว่างเป็นเงิน" ใน use-cases.md — และเป็นท่อนเดโมสดที่แรงที่สุดเพราะเห็น LINE เด้ง 2 เครื่องแข่งกันต่อหน้า

### 3.3 Win-back ลูกค้าหายเกิน 3 เดือน

- Cron รายวันหา Customer ที่ `lastVisitAt` เกิน 90 วัน + มี `consentMarketing` + ยังไม่เคยถูกส่งในแคมเปญรอบนี้
- ส่งข้อความโปรดึงกลับอัตโนมัติ (ข้อความ/ส่วนลดตั้งค่าได้จาก dashboard)
- **หน้าวัดผล**: ส่งไปกี่คน → กลับมาจองกี่คน → คิดเป็นรายได้เท่าไหร่ — ตัวเลขนี้คือสไลด์ขายที่ดีที่สุด เพราะมันตอบคำถาม "จ้างคุณแล้วได้เงินคืนเมื่อไหร่" ด้วยตัวเลขจริง
- use-cases.md ชี้ว่าข้อนี้ "ทำเงินให้ลูกค้าเห็นชัดที่สุด" — demo ต้อง seed ข้อมูลให้หน้านี้มีเรื่องราวตั้งแต่วันแรก

### 3.4 คอร์สใกล้หมดอายุ

- ขายคอร์สแบบนับครั้ง (เช่น ทำหน้า 10 ครั้ง หมดอายุใน 6 เดือน) — บันทึกใช้ครั้งจากหน้านัด
- เตือน 2 ฝั่ง: **ลูกค้า** ("คอร์สของคุณเหลือ 4 ครั้ง หมดอายุใน 30 วัน — จองคิวเลย") และ**ร้าน** (รายการคอร์สที่กำลังจะหมดอายุ = รายชื่อที่ควรโทรตาม)
- ธุรกิจจริง: คอร์สที่หมดอายุโดยไม่ได้ใช้คือระเบิดเวลาเรื่อง refund และรีวิวแย่ — ระบบนี้กันไว้ก่อน

### 3.5 ฐานที่รองทั้ง 4 ข้อ

- **Dashboard สรุปรายวัน** — รายได้ จำนวนเคส แยกต่อช่าง + สรุปปิดร้านส่งเข้า LINE เจ้าของทุกค่ำ
- **PDPA ในตัว** — consent 2 ชนิด (เตือนนัด / การตลาด) พร้อม timestamp · RBAC 3 ระดับ · MessageLog ตรวจสอบย้อนหลังได้
- **ระบบเฝ้าตัวเอง** — failure alert, dead-man switch, uptime monitor (Phase 8) — จุดต่างประจำตัวคุณในทุกงาน

---

## 4. โครงสร้างข้อมูล

```prisma
// ── ผู้ใช้ฝั่งร้าน ─────────────────────────────────
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(STAFF)    // ADMIN | STAFF | VIEWER
  createdAt    DateTime @default(now())
}
// VIEWER เห็นตารางนัด แต่ไม่เห็นเบอร์โทร/ประวัติการมา — จุดโชว์ PDPA

// ── ลูกค้า ────────────────────────────────────────
model Customer {
  id               String    @id @default(cuid())
  name             String
  phone            String    @unique
  lineUserId       String?   @unique        // null = ยังไม่ผูก LINE
  linkCode         String?   @unique        // รหัสเชื่อม 6 หลัก ใช้ครั้งเดียว
  consentReminder  Boolean   @default(false) // ยินยอมรับข้อความเตือนนัด
  consentMarketing Boolean   @default(false) // ยินยอมรับข้อความการตลาด (win-back)
  consentAt        DateTime?                 // หลักฐานว่ายินยอมเมื่อไหร่
  lastVisitAt      DateTime?                 // หัวใจของ win-back
  note             String?                   // โน้ตทั่วไป — ห้ามใส่ข้อมูลการรักษา
  isActive         Boolean   @default(true)
  appointments     Appointment[]
  waitlistEntries  WaitlistEntry[]
  courses          CustomerCourse[]
}

// ── ช่าง/หมอ และบริการ ────────────────────────────
model Provider {                             // ช่าง / หมอ / เตียง
  id           String        @id @default(cuid())
  name         String
  isActive     Boolean       @default(true)
  appointments Appointment[]
}

model Service {
  id          String        @id @default(cuid())
  name        String                        // "ทำความสะอาดผิวหน้า" — ชื่อกลางๆ พอ
  durationMin Int
  price       Decimal       @db.Decimal(10,2)
  isActive    Boolean       @default(true)
  appointments Appointment[]
}

// ── นัดหมาย ───────────────────────────────────────
model Appointment {
  id            String    @id @default(cuid())
  customerId    String
  providerId    String
  serviceId     String
  startsAt      DateTime
  endsAt        DateTime
  status        ApptStatus @default(BOOKED)
  // BOOKED → CONFIRMED | RESCHEDULE_REQUESTED | CANCELLED | NO_SHOW | COMPLETED
  cancelReason  String?
  createdById   String                       // ใครเป็นคนสร้างนัด (audit)
  customer      Customer  @relation(fields: [customerId], references: [id])
  provider      Provider  @relation(fields: [providerId], references: [id])
  service       Service   @relation(fields: [serviceId], references: [id])
  messages      MessageLog[]
  @@index([providerId, startsAt])
  @@index([status, startsAt])
}

// ── Waitlist ──────────────────────────────────────
model WaitlistEntry {
  id           String        @id @default(cuid())
  customerId   String
  serviceId    String
  windowStart  DateTime                      // ช่วงที่ลูกค้าสะดวก
  windowEnd    DateTime
  status       WaitlistStatus @default(WAITING)
  // WAITING | OFFERED | CLAIMED | EXPIRED | CANCELLED
  offeredApptSlot DateTime?
  customer     Customer  @relation(fields: [customerId], references: [id])
  @@index([status, windowStart])
}

// ── คอร์ส ─────────────────────────────────────────
model CoursePackage {                        // แม่แบบคอร์สที่ร้านขาย
  id            String   @id @default(cuid())
  name          String                       // "คอร์สทรีตเมนต์ 10 ครั้ง"
  totalSessions Int
  validDays     Int                          // อายุคอร์สนับจากวันซื้อ
  price         Decimal  @db.Decimal(10,2)
  isActive      Boolean  @default(true)
  purchases     CustomerCourse[]
}

model CustomerCourse {                       // คอร์สที่ลูกค้าซื้อแล้ว
  id           String   @id @default(cuid())
  customerId   String
  packageId    String
  usedSessions Int      @default(0)
  purchasedAt  DateTime @default(now())
  expiresAt    DateTime
  customer     Customer      @relation(fields: [customerId], references: [id])
  package      CoursePackage @relation(fields: [packageId], references: [id])
  @@index([expiresAt])
}

// ── แคมเปญ win-back ───────────────────────────────
model Campaign {
  id            String   @id @default(cuid())
  name          String                       // "โปรดึงลูกค้ากลับ ก.ย. 69"
  message       String                       // ข้อความ/โปรที่จะส่ง
  inactiveDays  Int      @default(90)
  isActive      Boolean  @default(true)
  runs          CampaignRun[]
}

model CampaignRun {                          // ส่งหาใคร แล้วเกิดอะไรขึ้น — ตัววัด ROI
  id           String    @id @default(cuid())
  campaignId   String
  customerId   String
  sentAt       DateTime  @default(now())
  returnedAt   DateTime?                     // กลับมาจองเมื่อไหร่ (null = ยังไม่กลับ)
  revenue      Decimal?  @db.Decimal(10,2)   // รายได้จากการกลับมาครั้งแรก
  campaign     Campaign  @relation(fields: [campaignId], references: [id])
  @@unique([campaignId, customerId])
}

// ── บันทึกข้อความ (audit trail) ───────────────────
model MessageLog {
  id             String   @id @default(cuid())
  customerId     String
  appointmentId  String?
  type           MsgType
  // REMINDER_1D | REMINDER_2H | SLOT_OFFER | WINBACK | COURSE_EXPIRY | DAILY_DIGEST
  deliveryStatus String
  // SENT | FAILED | SKIPPED_NO_CONSENT | SKIPPED_NO_LINE | SKIPPED_DUPLICATE
  sentAt         DateTime @default(now())
  appointment    Appointment? @relation(fields: [appointmentId], references: [id])
  @@index([customerId, sentAt])
  @@index([type, sentAt])
}
```

**หมายเหตุออกแบบ 4 ข้อ**

1. **`MessageLog` บันทึกแม้ตอน "ไม่ส่ง"** — แถว `SKIPPED_NO_CONSENT` คือหลักฐานว่าระบบเคารพความยินยอมจริง ไม่ใช่แค่พูด เอาหน้านี้เปิดให้เจ้าของคลินิกดูตอนขายได้เลย
2. **consent เก็บเป็น 2 ฟิลด์แยก + timestamp** — ลูกค้าอาจยอมรับเตือนนัดแต่ไม่เอาโฆษณา PDPA ต้องแยกวัตถุประสงค์ และต้องตอบได้ว่ายินยอมเมื่อไหร่
3. **ไม่มีฟิลด์ "รายละเอียดการรักษา" ในระบบเลย** — ตัดปัญหาข้อมูลสุขภาพตั้งแต่ schema: เก็บแค่ชื่อบริการกลางๆ กับตารางเวลา ข้อความทุกฉบับจึงสะอาดโดยโครงสร้าง ไม่ต้องพึ่งวินัยคน (ระบบเวชระเบียนจริงเป็นงานคนละระดับราคา — เขียนกันไว้ในใบเสนอราคา)
4. **สถานะนัดเป็น state machine เข้มงวด** — เช่น `CANCELLED` ไปต่อไหนไม่ได้แล้ว, `CONFIRMED` ไป `NO_SHOW` ได้ — validate ที่ service layer พร้อม unit test เพราะทุก transition มีผลกับ reminder job และ waitlist

---

## 5. API ที่จะมีทั้งหมด

### Internal API (JWT — ใช้โดย Dashboard)

```
POST   /api/auth/login                       เข้าสู่ระบบ → access + refresh token
POST   /api/auth/refresh
GET    /api/auth/me

GET    /api/customers                        ?search= &inactive90= &page= &limit=
POST   /api/customers                        CRUD + PATCH consent (บันทึก consentAt อัตโนมัติ)
GET    /api/customers/:id
PATCH  /api/customers/:id
POST   /api/customers/:id/link-code          สร้างรหัสเชื่อม LINE 6 หลัก

GET    /api/providers                        CRUD ครบ
GET    /api/services                         CRUD ครบ

GET    /api/appointments                     ?date= &providerId= &status=
POST   /api/appointments                     สร้างนัด → ตั้ง reminder jobs อัตโนมัติ
PATCH  /api/appointments/:id                 เลื่อนเวลา → ยกเลิก jobs เก่า ตั้งใหม่
POST   /api/appointments/:id/confirm         (ฝั่งร้านกดแทนลูกค้าได้ เช่น ยืนยันทางโทรศัพท์)
POST   /api/appointments/:id/cancel          → trigger waitlist matching
POST   /api/appointments/:id/no-show
POST   /api/appointments/:id/complete        → อัปเดต lastVisitAt + ตัดครั้งคอร์ส (ถ้าเลือกใช้)

GET    /api/waitlist                         ?status=
POST   /api/waitlist                         เพิ่มลูกค้าเข้า waitlist
DELETE /api/waitlist/:id

GET    /api/courses/packages                 CRUD แม่แบบคอร์ส
POST   /api/courses/purchases                บันทึกการซื้อคอร์ส
GET    /api/courses/expiring                 ?days=30 — รายชื่อที่ร้านควรโทรตาม

GET    /api/campaigns                        CRUD + toggle
GET    /api/campaigns/:id/results            ส่งกี่คน กลับกี่คน รายได้เท่าไหร่ (ROI)
POST   /api/campaigns/:id/test               ส่งทดสอบเข้า LINE แอดมิน

GET    /api/dashboard/summary                ?date= — รายได้/เคส/no-show แยกต่อช่าง
GET    /api/dashboard/kpi                    การ์ด 4 ตัวหน้าแรก
GET    /api/messages                         MessageLog feed — หน้าตรวจสอบ PDPA
```

### Webhook + Demo

```
POST   /webhooks/line                        verify x-line-signature เสมอ — รับ:
                                             · ข้อความรหัสเชื่อม 6 หลัก → ผูกบัญชี
                                             · postback ยืนยัน/ขอเลื่อนนัด
                                             · postback จองคิวว่าง (waitlist claim)

POST   /api/demo/advance-time                Demo Time Machine — เลื่อนเวลาให้ job ยิงทันที
POST   /api/demo/reset                       ล้างกลับ seed เริ่มต้น (ใช้ก่อนเดโมทุกครั้ง)
                                             ← ทั้งสองเปิดเฉพาะ DEMO_MODE=true ปิดตายใน production
```

### System

```
GET    /health                               liveness — ใช้กับ uptime monitor
GET    /health/deep                          เช็ค DB + Redis + queue depth
GET    /docs                                 Swagger UI
GET    /docs-json                            OpenAPI spec (import Postman ได้)
```

---

## 6. แผนราย Phase

### Phase 0 — วางราก · **วันที่ 1** ✅ เสร็จแล้ว (30 ส.ค. 2569)

| งาน                          | ทำจริงเป็นอะไร                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| สร้าง monorepo               | pnpm workspace: `backend/` (NestJS), `frontend/` (Next.js), `shared/` (enum + brand + API types) |
| Docker Compose สำหรับ dev    | `postgres:17-alpine` พอร์ต **5433** · `redis:7-alpine` พอร์ต **6380** (เลี่ยงชนของเดิมในเครื่อง) |
| Prisma + migration แรก       | ตาราง `User` + enum `Role` · migration `init_user` ผ่านแล้ว                                      |
| lint / format / commit hook  | ESLint 10 (flat config) + Prettier 3 + husky + lint-staged                                       |
| `.env.example` ครบทุกตัว     | รวม `DEMO_MODE`, `TZ=Asia/Bangkok`, ช่อง LINE และ JWT ที่จะใช้ในเฟสถัดไป                         |
| health endpoint              | `/health` (ไม่แตะ DB) และ `/health/deep` (วัด latency ของ DB จริง)                               |
| exception filter             | ทุก error คืนรูปแบบเดียวกันทั้งระบบตั้งแต่วันแรก                                                 |
| หน้าแรก dashboard            | หน้าตรวจสถานะพร้อมแบรนด์ THNP — พิสูจน์ว่า frontend → API → DB ต่อกันติดในภาพเดียว               |
| เทสต์ชุดแรก                  | 3 เคสของ health controller (ผ่าน)                                                                |
| git repo                     | init แล้ว พร้อม commit แรก                                                                       |

**เสร็จเมื่อ** — ✅ `pnpm db:up` ขึ้น DB ได้ · `pnpm dev` รัน API :3001 + dashboard :3000 พร้อมกัน · `/health/deep` รายงานว่าต่อ DB ได้จริง · `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` เขียวทั้งหมด

#### สิ่งที่เปลี่ยนจากแผนเดิม และเหตุผล

ตอนลงมือจริงพบว่าเวอร์ชันล่าสุดของหลายตัวขยับไปไกลกว่าที่แผนล็อกไว้ จึงตัดสินใจใหม่ 3 เรื่อง:

| เรื่อง             | ตัดสินใจ                        | เหตุผล                                                                                                                                                                                                    |
| ------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NestJS**         | อยู่ที่ **11** ไม่ขึ้น 12       | NestJS 12 เป็น **ESM อย่างเดียว** (`"type": "module"` ไม่มี CJS เหลือเลย) ทำให้ Jest รันไม่ได้ทันที และยังต้องแก้เรื่อง decorator metadata กับ Prisma client ที่ generate เป็น `.ts` — ปลายทางคือส่งมอบให้ลูกค้าดูแลต่อ ความนิ่งสำคัญกว่าเลขเวอร์ชัน |
| **TypeScript**     | **5.9.3** ไม่ใช้ 7              | `typescript-eslint` ยังรองรับแค่ `>=4.8.4 <6.1.0` — ขึ้น TS 7 เมื่อไหร่ lint ตายทันที                                                                                                                     |
| **Prisma**         | **7.10** (จาก 6 ในใจเดิม)       | ใช้ stable ล่าสุด แต่ต้องรู้ว่า Prisma 7 ย้าย connection string ออกจาก `schema.prisma` ไปไว้ที่ `prisma.config.ts` และ client ต่อ DB ผ่าน **driver adapter** (`@prisma/adapter-pg`) แล้ว                  |
| **Next.js**        | **16** (จาก 15)                 | ขึ้นได้ไม่มีปัญหา ใช้คู่กับ React 19 + Tailwind 4                                                                                                                                                          |

#### บทเรียนที่เจอตอนวางราก (เอาไปเล่าให้ลูกค้าฟังได้)

1. **pnpm บล็อก postinstall script ของ dependency ทุกตัวโดย default** — Prisma จะดาวน์โหลด query engine ไม่ได้และใช้งานไม่ได้เลย ต้องอนุญาตเป็นรายตัวใน `pnpm-workspace.yaml` (และเราปิด `@scarf/scarf` ที่เป็นตัวเก็บสถิติส่งกลับผู้พัฒนาไปด้วย)
2. **`incremental: true` + `deleteOutDir: true` = คอมไพล์ผ่านแต่ไม่มีไฟล์ออกมา** — tsc เก็บไฟล์ `.tsbuildinfo` ไว้ข้างนอก `dist/` พอ Nest ลบ `dist` ทิ้ง tsc ยังเข้าใจว่า output ครบแล้วเลยไม่ emit อะไรเลย จบที่ error `Cannot find module dist/main` ทั้งที่ขึ้นว่า "Found 0 errors" แก้ด้วยการย้าย `tsBuildInfoFile` เข้าไปใน `dist/` ให้ถูกลบพร้อมกัน

   > อาการแบบนี้แหละที่เข้าข่าย "พังเงียบ" — ทุกอย่างรายงานว่าสำเร็จ แต่ผลลัพธ์ไม่มีจริง เป็นเหตุผลเดียวกับที่ระบบของเราต้องมีตัวเฝ้าตัวเองใน Phase 8

---

### Phase 1 — Auth + CRUD ฐาน · **วันที่ 2–4**

**วันที่ 2 — Auth + RBAC**

- Prisma schema ครบทุกตารางในข้อ 4 + migration
- `AuthModule`: bcrypt, JWT access (15 นาที) + refresh (7 วัน), `JwtAuthGuard`, `RolesGuard`
- **สิทธิ์ 3 ระดับต้องต่างกันจริงตั้งแต่วันแรก**: VIEWER ถูก serializer ตัด `phone`, `note`, `lastVisitAt` ออกจาก response — เขียน test ยืนยัน เพราะนี่คือจุดขาย PDPA ไม่ใช่ของแถม
- Global `ValidationPipe` + exception filter คืน error format เดียวกันทั้งระบบ (โครงทำไว้แล้วใน Phase 0)

**วันที่ 3 — CRUD Customer / Provider / Service**

- Module ละ controller + service + DTO + pagination มาตรฐาน `{ data, meta }`
- PATCH consent ต้องบันทึก `consentAt` อัตโนมัติ และ**ห้าม**แก้ consent ย้อนหลังโดยไม่ทับ timestamp
- Soft delete ทุกตัว (ร้านจริงไม่ลบข้อมูลถาวร)

**วันที่ 4 — Seed + Unit test ชุดแรก**

- Seed: ผู้ใช้ 3 role · ช่าง 3 คน · บริการ 8 รายการ · ลูกค้า 20 คน (บางคนมี LINE บางคนไม่ มี consent หลากหลาย)
- Jest + Supertest: auth flow, RBAC (VIEWER ไม่เห็นเบอร์), CRUD หลัก

**เสร็จเมื่อ** — login 3 role ผ่าน Postman แล้วเห็นข้อมูลไม่เท่ากันจริง

---

### Phase 2 — Appointment Engine · **วันที่ 5–7**

นี่คือกระดูกสันหลัง อย่ารีบ

**วันที่ 5 — CRUD นัด + กันจองซ้อน**

- สร้างนัด: คำนวณ `endsAt` จาก `service.durationMin`
- **กันจองซ้อน**: เช็ค overlap ต่อ provider ใน transaction (`SELECT ... FOR UPDATE` ช่วงเวลาที่ชนกัน) — เคสนี้ต้องมี test ยิงพร้อมกัน 2 request แล้วสำเร็จแค่ 1
- Query ตารางนัดรายวัน/รายช่าง สำหรับหน้าบอร์ดคิว

**วันที่ 6 — State machine**

- ตาราง transition ที่อนุญาต + `AppointmentStateMachine` service เดียวที่ทุก endpoint ต้องผ่าน:

  | จาก                   | ไปได้                                          |
  | --------------------- | ---------------------------------------------- |
  | BOOKED                | CONFIRMED · RESCHEDULE_REQUESTED · CANCELLED · NO_SHOW · COMPLETED |
  | CONFIRMED             | CANCELLED · NO_SHOW · COMPLETED                |
  | RESCHEDULE_REQUESTED  | BOOKED (นัดเวลาใหม่) · CANCELLED               |
  | CANCELLED / COMPLETED / NO_SHOW | — (จบ)                               |

- `complete` → อัปเดต `customer.lastVisitAt` + ตัดครั้ง `CustomerCourse` ถ้าเลือกใช้คอร์ส
- Unit test ครบทุก transition รวมเคสต้องห้าม

**วันที่ 7 — เลื่อนนัด + เก็บตก**

- PATCH เวลานัด = ยกเลิกนัดเชิงตรรกะ + สร้างรอบใหม่ใน transaction เดียว (ประวัติไม่หาย)
- Endpoint `GET /api/customers?inactive90=true` — ฐานของ win-back
- Integration test: จองซ้อน / เลื่อน / ยกเลิก

**เสร็จเมื่อ** — สร้างนัด เลื่อน ยกเลิก ผ่าน Postman ได้ครบ และยิงจองซ้อนพร้อมกันแล้วระบบกันได้จริง

---

### Phase 3 — LINE Integration · **วันที่ 8–10**

**วันที่ 8 — Webhook + ผูกบัญชี**

- `@line/bot-sdk` + `POST /webhooks/line` verify `x-line-signature` ทุก request
- Flow ผูกบัญชี: พนักงานกดสร้างรหัส 6 หลักบน dashboard → บอกลูกค้าให้แอดเพื่อน LINE OA แล้วพิมพ์รหัส → ระบบผูก `lineUserId` + ตอบยืนยัน "เชื่อมต่อสำเร็จ คุณ [ชื่อ]" → รหัสใช้แล้วทิ้ง
- ข้อความอื่นที่บอทไม่เข้าใจ → ตอบ default สุภาพ + บอกช่องทางติดต่อร้าน

**วันที่ 9 — Flex Message เตือนนัด + ปุ่ม**

- `NotificationModule` แบบ strategy (เผื่อเพิ่ม SMS/Email ทีหลังโดยไม่ต้องแก้ของเดิม)
- ออกแบบ Flex เตือนนัด: โลโก้ร้าน + วัน-เวลา + ชื่อช่าง + ปุ่ม `✅ ยืนยันนัด` / `🔄 ขอเลื่อนนัด` (postback มี `appointmentId` + `action`)
- **ภาพ Flex บนมือถือคือภาพผลงานที่ทรงพลังที่สุดของชุดนี้ — ลงเวลาออกแบบให้สวยจริง อย่าทำลวก** ใช้สีทอง/กรมท่าจาก `shared/src/brand.ts` ให้ตรงกับหน้าจอ

**วันที่ 10 — Postback ครบวง**

- postback `confirm` → state machine → `CONFIRMED` → ตอบในแชท "ยืนยันเรียบร้อย แล้วพบกันครับ 🙏"
- postback `reschedule` → `RESCHEDULE_REQUESTED` → ตอบ "รับเรื่องแล้ว เดี๋ยวทางร้านติดต่อกลับ" + push แจ้ง LINE แอดมินร้าน
- กัน postback ซ้ำ (กดปุ่มเดิม 2 ครั้ง) — ตอบสถานะปัจจุบันแทนการ error
- เขียน `MessageLog` ทุกการส่ง

**เสร็จเมื่อ** — 🏁 **หมุดที่ 1**: กดปุ่มบนมือถือจริง แล้วสถานะนัดใน DB เปลี่ยน (ดูผ่าน Prisma Studio ได้ ยังไม่ต้องมีหน้าจอ)

---

### Phase 4 — Reminder Scheduler + Time Machine · **วันที่ 11–12**

**วันที่ 11 — Reminder jobs**

- BullMQ delayed job รายนัด 2 ตัว: `reminder-1d`, `reminder-2h` — jobId ผูกกับ `appointmentId+type` เพื่อ**กันส่งซ้ำโดยโครงสร้าง**
- สร้าง/เลื่อน/ยกเลิกนัด → sync jobs เสมอ (เลื่อนนัด = ลบ job เก่า ตั้งใหม่)
- ก่อนส่งเช็คเงื่อนไขเสมอ: นัดยัง `BOOKED`/`CONFIRMED`? มี `lineUserId`? มี `consentReminder`? — ตกข้อไหนเขียน `MessageLog` เป็น `SKIPPED_*` ไม่ส่ง
- Worker แยก process (`main.worker.ts`) + Bull Board ที่ `/admin/queues` (basic auth)

**วันที่ 12 — Demo Time Machine + digest**

- `ClockService` ชั้นกลางครอบ `new Date()` ทั้งระบบ — `DEMO_MODE=true` อ่าน offset จาก Redis, `POST /api/demo/advance-time` ขยับ offset แล้ว promote delayed jobs ที่ถึงกำหนด
- ปุ่ม "⏩ ข้ามเวลา" บน dashboard (เห็นเฉพาะ demo mode)
- Cron `daily-digest` 21:00 น. — สรุปปิดร้านเข้า LINE เจ้าของ: รายได้วันนี้ / เคสต่อช่าง / no-show / นัดพรุ่งนี้กี่คิว
- Cron `heartbeat` ทุก 5 นาที (ใช้ต่อใน Phase 8)

**เสร็จเมื่อ** — สร้างนัดพรุ่งนี้ → กดข้ามเวลา → LINE เตือนเด้งเข้ามือถือใน 5 วินาที → กดยืนยัน → DB เปลี่ยน — **นี่คือ loop เดโมหลักของทั้งโปรเจกต์ ต้องลื่นไม่มีสะดุด**

---

### Phase 5 — Waitlist Engine · **วันที่ 13**

- ยกเลิกนัด (จาก dashboard หรือลูกค้าแจ้ง) → job `waitlist-match`: หา `WaitlistEntry` ที่ `WAITING` และช่วงเวลาครอบ slot ที่ว่าง → push Flex "มีคิวว่าง" หาทุกคนที่เข้าเกณฑ์ พร้อมปุ่ม `จองคิวนี้` → ตั้งสถานะ `OFFERED` + หมดเขต 30 นาที
- postback claim → **transaction**: เช็ค slot ยังว่าง → สร้างนัดใหม่ `BOOKED` → entry เป็น `CLAIMED` → คนอื่นที่กดตามได้ "ขออภัย คิวนี้มีผู้จองแล้ว" → entry ที่เหลือกลับ `WAITING`
- เคส race กด 2 คนพร้อมกัน — ต้องมี test ยืนยันว่าได้นัดแค่ 1
- หมดเขตไม่มีใครกด → `EXPIRED` + แจ้งร้านให้จัดการเอง

**เสร็จเมื่อ** — มือถือ 2 เครื่อง (หรือ 2 บัญชี) กดแย่งคิวกัน คนแรกได้ คนหลังได้ข้อความสุภาพ — ท่อนนี้อัดวิดีโอเก็บไว้เลย

---

### Phase 6 — Win-back + คอร์ส · **วันที่ 14–15**

**วันที่ 14 — Win-back**

- Cron รายวัน 10:00: หา Customer `lastVisitAt` > `campaign.inactiveDays` + `consentMarketing` + ยังไม่มี `CampaignRun` ในแคมเปญนี้ → ส่งข้อความโปร → บันทึก `CampaignRun`
- ลูกค้าใน CampaignRun กลับมาจอง (สร้างนัดใหม่) → stamp `returnedAt` + `revenue` จากราคาบริการครั้งแรกที่ complete — **ตัวเลข ROI เกิดอัตโนมัติ**
- Throttle การส่ง (คิวละ 1/วินาที) กันชนกับ rate limit ของ LINE

**วันที่ 15 — คอร์สใกล้หมดอายุ**

- CRUD `CoursePackage` + บันทึกซื้อ (`expiresAt = purchasedAt + validDays`)
- Cron รายวัน: เหลือ ≤ 30 วันและยังมีครั้งเหลือ → เตือนลูกค้า (ครั้งเดียวต่อช่วง — กันสแปมด้วย `MessageLog` type `COURSE_EXPIRY`)
- `GET /api/courses/expiring` — ลิสต์ให้ร้านโทรตาม
- หน้านัด: ถ้าลูกค้ามีคอร์สของบริการนั้น เลือก "ตัดครั้งจากคอร์ส" ได้ตอน complete

**เสร็จเมื่อ** — 🏁 **หมุดที่ 2**: 4 ตัวทำเงินทำงานครบใน backend — เหลือแค่ทำหน้าจอให้สวย

---

### Phase 7 — Dashboard (Next.js) · **วันที่ 16–18**

**วันที่ 16 — โครง + Auth + บอร์ดคิววันนี้**

- Next.js 16 App Router + Tailwind 4 + shadcn/ui + TanStack Query · token ใน httpOnly cookie (ไม่เก็บใน localStorage) · refresh อัตโนมัติเมื่อ 401
- **หน้าคิววันนี้ = ภาพหน้าปกของทั้งโปรเจกต์**: การ์ดนัดเรียงตามเวลา แยกคอลัมน์ต่อช่าง สีตามสถานะ (เหลือง BOOKED · เขียว CONFIRMED · ส้ม RESCHEDULE_REQUESTED · แดง NO_SHOW · เทา COMPLETED) — refresh อัตโนมัติทุก 10 วิ ให้เดโม "กดใน LINE แล้วจอเปลี่ยน" เห็นสด
- ปุ่มด่วนบนการ์ด: มาแล้ว / ไม่มา / ยกเลิก

**วันที่ 17 — หน้าเงิน**

| หน้า           | เนื้อหา                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **ปฏิทินนัด**  | มุมมองสัปดาห์ต่อช่าง + สร้าง/เลื่อนนัด + สร้างรหัสเชื่อม LINE                                                |
| **ลูกค้า**     | ตาราง + ป้าย "หายไป X วัน" + toggle consent 2 ชนิด (โชว์ consentAt) + ประวัติการมา                           |
| **Win-back**   | ผลแคมเปญ: ส่ง → กลับมา → รายได้ (ROI) + ตั้งค่าแคมเปญ + ปุ่มส่งทดสอบ ← **หน้าที่ใช้ปิดการขาย**              |
| **คอร์ส**      | คอร์สทั้งหมด + แถบครั้งคงเหลือ + ลิสต์ใกล้หมดอายุ (เรียงตามวัน)                                              |

**วันที่ 18 — หน้าที่เหลือ + ขัดผิว**

| หน้า            | เนื้อหา                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| **สรุปรายวัน**  | KPI 4 การ์ด (รายได้วันนี้ · เคส · no-show ที่กันได้เดือนนี้ · ลูกค้าดึงกลับได้) + กราฟ 7 วัน + ตารางต่อช่าง |
| **ข้อความ**     | MessageLog feed — เห็นชัดว่าฉบับไหนส่ง/ข้ามเพราะอะไร ← หน้าโชว์ PDPA                        |
| **Monitoring**  | สถานะ queue + heartbeat + ข้อความที่ส่งไม่สำเร็จ                                            |
| **Settings**    | จัดการผู้ใช้/สิทธิ์ · ข้อมูลร้าน · ปุ่ม Time Machine (demo mode)                            |

- Responsive (เจ้าของร้านเปิดมือถือแน่นอน) + empty/loading/error states ทุกหน้า — สามอย่างนี้แยก demo มืออาชีพออกจาก demo นักศึกษา
- ล็อกอินด้วย VIEWER แล้วเห็นจริงว่าเบอร์โทรถูกซ่อน

**เสร็จเมื่อ** — เปิด dashboard เล่าเรื่องทั้งระบบให้คนไม่รู้เทคนิคเข้าใจได้ โดยไม่ต้องเปิด terminal

---

### Phase 8 — Deploy + ระบบเฝ้าตัวเอง · **วันที่ 19–20**

**วันที่ 19 — ขึ้นระบบ**

- Dockerfile multi-stage (node:22-alpine, non-root) · Railway: API + Worker + Postgres + Redis · Dashboard ขึ้น Vercel
- `prisma migrate deploy` ตอน deploy · env ครบ · `TZ=Asia/Bangkok` · CORS + Helmet
- ตั้ง LINE webhook URL ชี้ production + ทดสอบผูกบัญชีจริง 1 รอบ

**วันที่ 20 — "ไม่พังเงียบ" + seed ข้อมูลสมจริง**

สามชั้นนี้ **ห้ามตัดเด็ดขาด เพราะนี่คือจุดต่างประจำตัวคุณ**:

1. **Failure alert** — ส่ง LINE ไม่สำเร็จติดกัน 3 ฉบับ → push แจ้งแอดมิน
2. **Dead-man switch** — heartbeat ค้างเกิน 15 นาที = worker ตาย → แจ้งเตือน (เตือนนัดที่ไม่ยิงคือ no-show ที่ระบบก่อเอง — ยอมไม่ได้)
3. **UptimeRobot** ยิง `/health` ทุก 5 นาที
4. Structured logging (pino) + `X-Request-Id`

**Seed ข้อมูลย้อนหลัง 6 เดือน** — สำคัญกับการขายมาก อย่าสุ่มมั่ว ให้มีเรื่องราว:

- ลูกค้า ~60 คน (ผูก LINE ~35 · consent หลากหลาย · **หายเกิน 90 วัน ~12 คน**)
- นัดย้อนหลัง ~12–15 คิว/วัน · no-show ~15% ช่วงแรก แล้ว**ลดเหลือ ~5% ช่วงหลัง** — กราฟเล่าเองว่า "ติดระบบแล้วดีขึ้น"
- คอร์ส ~15 ใบ (ใกล้หมดอายุ 4 · หมดแล้ว 2 — โชว์ปัญหาที่ระบบกันได้)
- แคมเปญ win-back 1 รอบที่ส่ง 12 ดึงกลับ 4 รายได้ ~6,800 บาท — หน้า ROI มีตัวเลขตั้งแต่วันแรก
- นัดวันนี้+พรุ่งนี้ ~10 คิวหลายสถานะ ให้บอร์ดคิวมีสีสันทันทีที่เปิด

**เสร็จเมื่อ** — 🏁 **หมุดที่ 3**: ปิด worker ทิ้ง 15 นาที แล้ว LINE เตือนว่าระบบตาย + เปิดลิงก์ production บนมือถือแล้วทุกหน้าสวย

---

### Phase 9 — เก็บผลงาน · **วันที่ 21**

- `POST /api/demo/reset` ให้ข้อมูลอยู่สภาพพร้อมเดโม แล้วแคปภาพตามข้อ 9
- อัดวิดีโอ 60–90 วินาที (YouTube unlisted):

  **สคริปต์:** เปิดบอร์ดคิววันนี้ เห็นสีสถานะ (0:00–0:10) → สร้างนัดใหม่ (0:10–0:20) → กด "⏩ ข้ามเวลา" (0:20–0:25) → **สลับมือถือจริง: LINE เตือนเด้ง กด "ยืนยันนัด"** (0:25–0:40) → กลับจอใหญ่: การ์ดเปลี่ยนเขียวสดๆ (0:40–0:50) → ยกเลิกนัดหนึ่ง → **มือถือเด้ง "มีคิวว่าง" กดจอง → คิวเข้าบอร์ดทันที** (0:50–1:10) → ปิดที่หน้า Win-back ROI + หน้า Monitoring (1:10–1:25)

  ท่อนมือถือถ่ายเครื่องจริง อย่าใช้ simulator — คนดูแยกออกและมันทำลายความน่าเชื่อถือทั้งคลิป

- เขียนคำอธิบายผลงาน 1 ย่อหน้าภาษาลูกค้า + บัญชี demo read-only (`demo@clinicq.app` / VIEWER)
- อัปเดตหน้างาน Fastwork (งานที่ 4 และงานที่ 2) ใส่ภาพ + ลิงก์ demo

---

## 7. ข้อความ LINE ที่จะส่งจริง

ทุกฉบับยึดกติกา PDPA จาก use-cases.md: **ไม่มีรายละเอียดการรักษา/บริการเชิงสุขภาพในข้อความ** — บอกแค่ว่ามีนัด ที่ไหน เมื่อไหร่

**เตือนล่วงหน้า 1 วัน** (Flex + 2 ปุ่ม)

> 🔔 แจ้งเตือนนัดหมาย
> คุณมีนัดที่ **[ชื่อร้าน]**
> 📅 พรุ่งนี้ · พฤหัสบดี 3 ก.ย. · 14:00 น.
> 👩‍⚕️ กับคุณ [ชื่อช่าง]
> `[ ✅ ยืนยันนัด ]` `[ 🔄 ขอเลื่อนนัด ]`

**เตือนก่อน 2 ชั่วโมง**

> ⏰ อีก 2 ชั่วโมงถึงเวลานัดของคุณที่ [ชื่อร้าน] (14:00 น.) แล้วพบกันนะคะ 💕

**คิวว่าง (waitlist)**

> ✨ มีคิวว่าง!
> [ชื่อร้าน] มีคิวว่าง **พฤหัสบดี 3 ก.ย. · 15:30 น.**
> คิวนี้เสนอให้ลูกค้าที่รออยู่ — ท่านแรกที่กดได้เลยค่ะ
> `[ 📌 จองคิวนี้ ]`

**Win-back** (ส่งเฉพาะคนที่มี consentMarketing)

> 💌 คิดถึงคุณ [ชื่อ] จังเลยค่ะ
> ไม่ได้เจอกันนานแล้ว [ชื่อร้าน] มีส่วนลดพิเศษ **15%** สำหรับคุณโดยเฉพาะ ถึงสิ้นเดือนนี้
> ทักแชทนี้เพื่อจองคิวได้เลยค่ะ

**คอร์สใกล้หมดอายุ**

> 📋 คอร์สของคุณเหลือ **4 ครั้ง** และจะหมดอายุใน **30 วัน** (30 ก.ย.)
> จองคิวมาใช้ให้ครบนะคะ ทักแชทนี้ได้เลยค่ะ

**สรุปปิดร้าน (ส่งเจ้าของ ทุก 21:00)**

> 🌙 สรุปวันนี้ — [ชื่อร้าน]
> รายได้ 12,400 บาท · 14 เคส (A: 6 · B: 5 · C: 3)
> ยืนยันนัดพรุ่งนี้แล้ว 9/11 คิว · no-show วันนี้ 1
> คอร์สใกล้หมดอายุที่ควรโทรตาม: 2 ราย → ดูใน dashboard

---

## 8. ของที่ต้องเตรียม

| ต้องมี                                     | ใช้ตอน  | หมายเหตุ                                                                              |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------- |
| LINE Official Account + Messaging API      | Phase 3 | สมัครฟรีที่ LINE Developers Console — ตั้งชื่อ OA ให้ตรงกับแบรนด์ THNP Clinic          |
| Channel access token + secret + userId คุณ | Phase 3 | userId ได้จาก webhook event ตอนทักบอทครั้งแรก                                         |
| มือถือเครื่องที่ 2 หรือบัญชี LINE ที่ 2    | Phase 5 | ไว้ถ่ายฉากแย่งคิว waitlist                                                            |
| GitHub repo                                | Phase 0 |                                                                                       |
| บัญชี Railway + Vercel + UptimeRobot       | Phase 8 | ตัดสินใจแพลนตอนวันที่ 18 พอ                                                           |
| ชื่อร้าน + โลโก้จำลอง                      | Phase 3 | ตั้งชื่อร้านสมมุติให้ดูจริง เช่น "Glow Clinic" — ทำโลโก้ง่ายๆ ใน Canva 15 นาที       |
| รูปประกอบ Flex/หน้าร้าน                    | Phase 3 | Unsplash ได้ ตรวจ license ก่อน                                                        |

---

## 9. Checklist ผลงานที่ต้องเก็บ

หน้างานควรมี **6–8 ภาพ** (ภาพแรกแรงสุด — คือภาพที่คนเห็นในผลค้นหา):

- [ ] **1. บอร์ดคิววันนี้** — การ์ดสีตามสถานะ เต็มจอ ← ภาพหน้าปก
- [ ] **2. LINE เตือนนัดบนมือถือจริง พร้อมปุ่มยืนยัน/เลื่อน** ← ภาพที่ปิดการขาย
- [ ] **3. หน้า Win-back ROI** — ส่ง 12 · กลับมา 4 · รายได้ 6,800 ← ภาพที่ตอบ "คุ้มไหม"
- [ ] **4. ข้อความ "มีคิวว่าง" บนมือถือ** — พิสูจน์ประโยค "เปลี่ยนช่องว่างเป็นเงิน"
- [ ] **5. หน้าลูกค้า + consent PDPA** — พิสูจน์ว่าเราคิดเรื่องกฎหมายแทนลูกค้า
- [ ] **6. หน้าคอร์ส** — แถบครั้งคงเหลือ + ใกล้หมดอายุ
- [ ] **7. สรุปรายวัน** — KPI + กราฟ + สรุปปิดร้านใน LINE
- [ ] **8. หน้า Monitoring + Swagger** — พิสูจน์ "ไม่พังเงียบ" และ "มีเอกสาร API จริง"
- [ ] วิดีโอ 60–90 วินาที (สคริปต์ใน Phase 9)
- [ ] บัญชี demo read-only

---

## 10. PDPA + ความเสี่ยง + แพ็กเกจขายจริง

### PDPA

**ใน demo** — ข้อมูลทุกคนเป็นข้อมูลจำลองที่ seed ขึ้นมา จึงไม่มีประเด็น PDPA แต่**ออกแบบทุกอย่างเหมือนรับข้อมูลจริง** เพื่อให้ตัวระบบเป็นหลักฐานว่าเราทำเรื่องนี้เป็น

**ตอนรับงานจริง** — สิ่งที่ต้องคุยกับลูกค้าก่อนเซ็น (อิงเช็กลิสต์ท้าย use-cases.md):

| ประเด็น                                              | วิธีจัดการ                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| ร้านยังไม่เคยขอ consent ส่งข้อความจากลูกค้าเดิม      | ต้องทำ flow ขอ consent ก่อนเปิดระบบ (ฟอร์มหน้าร้าน/ข้อความแรกใน LINE) — ใส่ในขอบเขตงานและคิดเวลาเพิ่ม อย่าแถม                     |
| ร้านอยากใส่รายละเอียดการรักษาในข้อความ               | ปฏิเสธพร้อมเหตุผล — ระบบออกแบบมาไม่ให้ทำได้ตั้งแต่ schema และนั่นคือการปกป้องตัวลูกค้าเอง                                         |
| ใครเห็นข้อมูลอะไร                                    | เก็บ requirement เป็นตาราง role ตั้งแต่วันแรก — ระบบรองรับแล้ว เหลือแค่ config                                                    |
| ร้านขอระบบเวชระเบียน/บันทึกการรักษา                  | งานคนละระดับ (ข้อมูลสุขภาพเต็มรูปแบบ) — "ได้ครับ อันนั้นเป็นเฟสถัดไป เดี๋ยวผมทำใบเสนอราคาแยกให้" ตามกติกา use-cases.md            |

### ความเสี่ยง

| ความเสี่ยง                                                        | ทางแก้                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **โควตา LINE push ฟรี 500 ข้อความ/เดือน** — ร้านจริงเกินแน่       | คำนวณให้ลูกค้าเห็นก่อนเสนอราคา (คิว/วัน × 2 เตือน × 30 วัน) แล้วแนะแพ็กเกจ LINE OA ที่ต้องจ่าย LINE โดยตรง — **เขียนแยกจากค่าจ้างเราให้ชัดในใบเสนอราคา** เหมือนกติกาค่า AI/เซิร์ฟเวอร์ใน fastwork-gig-2-3-4.md |
| ลูกค้าร้านไม่แอด LINE OA — ระบบเตือนไม่ถึง                        | demo โชว์ MessageLog `SKIPPED_NO_LINE` ให้ร้านเห็นว่าใครยังไม่ผูก + แนะ workflow ให้พนักงานชวนผูกตอนจ่ายเงิน (รหัส 6 หลักใช้เวลา 30 วินาที)     |
| ร้านใช้ระบบนัดเดิมอยู่ (Google Calendar / สมุด / โปรแกรมสำเร็จรูป) | ถามก่อนเสนอราคาเสมอ (คำถามข้อ 1 ใน use-cases.md) — สมุด/Excel = ระบบเราแทนได้เลย · Calendar = เสนอ import ครั้งเดียวตอนติดตั้ง · โปรแกรมมี API = งาน integration คิดเพิ่ม |
| ร้านขายคอร์สเงื่อนไขพิสดาร (แชร์คอร์ส/ต่ออายุ/แปลงคอร์ส)          | use-cases.md เตือนไว้แล้วว่า "ถ้ามีคอร์ส งานจะซับซ้อนขึ้น" — MVP รองรับนับครั้ง+หมดอายุเท่านั้น เกินนี้คิดราคาเพิ่มเป็นเฟส                       |
| Time Machine หลุดไป production ลูกค้าจริง                         | เปิดด้วย `DEMO_MODE=true` เท่านั้น + endpoint คืน 404 ใน production + test ยืนยัน                                                                |
| งานบานจนไม่จบใน 21 วัน                                            | ถึงวันที่ 17 แล้ว Phase 7 ยังไม่เสร็จ → **ตัดหน้า Settings และกราฟ 7 วันออกก่อน** · ห้ามตัด Phase 8 และปุ่มยืนยันใน LINE — สองอย่างนั้นคือจุดขาย |

### Mapping แพ็กเกจขายจริง (สอดคล้องช่วงราคา use-cases.md ข้อ 13)

|              | **เตือนนัด** — 9,900                          | **ลดคิวเท + ดึงลูกค้ากลับ** ⭐ — 14,900                  | **ครบระบบ** — 19,900                                  |
| ------------ | --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| ระยะเวลา     | 10 วัน                                        | 16 วัน                                                   | 21 วัน                                                |
| ได้อะไร      | ตารางนัด + เตือน 1วัน/2ชม. + ปุ่มยืนยัน/เลื่อนใน LINE + สรุปปิดร้าน | ทุกอย่างซ้าย + waitlist คิวว่าง + win-back อัตโนมัติ + หน้าวัดผล ROI | ทุกอย่างซ้าย + ระบบคอร์ส + dashboard เต็ม + แบ่งสิทธิ์ 3 ระดับ |
| ตรงกับ Phase | 0–4 + digest                                  | + 5–6 (win-back)                                         | + 6 (คอร์ส) + 7 เต็ม                                  |

> เสนอราคาตามสูตร use-cases.md: เริ่มที่แพ็กเจ็บสุด (9,900) แล้วพูดว่า "ระบบนี้ต่อยอดไปดึงลูกค้าเก่ากลับและจัดการคอร์สได้ ไว้เรื่องนัดนิ่งแล้วค่อยคุยกัน" — และค่าดูแลรายเดือนเสนอแยกตั้งแต่ต้นเสมอ

---

## 11. สิ่งที่ไม่ทำใน demo นี้

เขียนไว้กันตัวเองหลงทาง — สิ่งเหล่านี้**ไม่ทำ** และไม่ใช่ข้อบกพร่อง (ส่วนใหญ่คือของขายรอบ 2–3 ตามตาราง "ลูกค้าหนึ่งราย = งานหลายชิ้น"):

- ให้ลูกค้าจองคิวเองออนไลน์แบบสาธารณะ (MVP: ร้านเป็นคนสร้างนัด — ควบคุมง่ายกว่าและตรงพฤติกรรมร้านไทยกว่า)
- LIFF / เว็บฝั่งลูกค้า (ปุ่ม postback พอสำหรับทุก flow ที่ขาย)
- สต็อกเวชภัณฑ์/ผลิตภัณฑ์ · ค่าคอมช่างละเอียด · ใบเสร็จ/ภาษี ← เฟสขายทีหลังตาม use-cases.md
- ระบบเวชระเบียน/บันทึกการรักษา (ข้อมูลสุขภาพเต็มรูปแบบ — งานคนละระดับราคา)
- Multi-branch / multi-tenant / ระบบเก็บเงิน
- แอปมือถือ · SMS (โครง NotificationModule รองรับไว้แล้ว เพิ่มทีหลังไม่ถึงวัน)
- i18n (ไทยอย่างเดียวพอ)

---

## สรุปไทม์ไลน์

| วัน   | Phase                  | ผลลัพธ์ที่จับต้องได้                                          |
| ----- | ---------------------- | ------------------------------------------------------------- |
| 1     | 0 — วางราก             | repo + docker + env รันได้                                    |
| 2–4   | 1 — Auth + CRUD        | login 3 role เห็นข้อมูลไม่เท่ากันจริง                         |
| 5–7   | 2 — Appointment Engine | จอง/เลื่อน/ยกเลิกได้ กันจองซ้อนได้จริง                        |
| 8–10  | 3 — LINE               | ✅ **กดปุ่มใน LINE แล้วสถานะนัดเปลี่ยน** (หมุดที่ 1)          |
| 11–12 | 4 — Reminder + ⏩      | เตือน 1วัน/2ชม. อัตโนมัติ + Time Machine เดโมสดได้            |
| 13    | 5 — Waitlist           | ✅ **ยกเลิกปุ๊บ คิวว่างเด้งหาคนรอ กดแย่งกันได้**              |
| 14–15 | 6 — Win-back + คอร์ส   | ✅ **ครบ 4 ตัวทำเงิน** (หมุดที่ 2)                            |
| 16–18 | 7 — Dashboard          | ✅ **มีหน้าจอเล่าเรื่องทั้งระบบได้**                          |
| 19–20 | 8 — Deploy + เฝ้าตัวเอง | ✅ **ลิงก์จริง + seed 6 เดือน + แจ้งเตือนเมื่อระบบพัง** (หมุดที่ 3) |
| 21    | 9 — เก็บผลงาน          | ✅ **ภาพ 8 ภาพ + วิดีโอ + บัญชี demo พร้อมขาย**               |

ถ้าช้ากว่าหมุดไหนเกิน 2 วัน ให้ตัดขอบเขตตามตารางความเสี่ยงข้อ 10 อย่ายืดเวลา — **demo ที่เสร็จและขายได้ ดีกว่า demo ที่สมบูรณ์แบบแต่ยังไม่เสร็จ**
