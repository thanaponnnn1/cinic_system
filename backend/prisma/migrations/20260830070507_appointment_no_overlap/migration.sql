-- กันนัดซ้อนกันในระดับฐานข้อมูล
--
-- ฝั่งแอปกันไว้แล้วด้วย advisory lock (ดู AppointmentsService.lockProvider) แต่ชั้นนั้น
-- ป้องกันได้เฉพาะเส้นทางที่ผ่านโค้ดของเรา ข้อจำกัดตรงนี้กันครอบทุกทาง รวมถึงสคริปต์
-- นำเข้าข้อมูล การแก้มือผ่าน SQL และเซิร์ฟเวอร์หลายตัวที่รันพร้อมกันตอนขึ้น production
--
-- ครอบเฉพาะสถานะที่นัดยังมีผลอยู่ (BOOKED, CONFIRMED) เพราะนัดที่ยกเลิกหรือจบไปแล้ว
-- ต้องทับช่วงเวลากับนัดใหม่ได้ ไม่งั้นย้ายนัดกลับมาเวลาเดิมไม่ได้เลย

-- btree_gist ทำให้เทียบเท่ากันแบบ = (providerId) อยู่ใน GiST index ร่วมกับช่วงเวลาได้
--
-- ใช้ tsrange ไม่ใช่ tstzrange เพราะ Prisma เก็บ DateTime เป็น timestamp without time zone
-- (ค่าที่เก็บเป็น UTC อยู่แล้ว) การแปลงเป็น timestamptz จะขึ้นกับค่า TimeZone ของ session
-- ทำให้ Postgres ถือว่าไม่ immutable และสร้าง index ไม่ได้
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_provider_no_overlap"
  EXCLUDE USING gist (
    "providerId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('BOOKED', 'CONFIRMED'));

-- ใช้ขอบเขต '[)' คือรวมเวลาเริ่ม ไม่รวมเวลาจบ
-- นัด 10:00–11:00 กับ 11:00–12:00 จึงต่อกันได้พอดีโดยไม่นับว่าชนกัน
