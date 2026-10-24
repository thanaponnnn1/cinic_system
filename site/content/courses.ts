import type { CourseInput } from '../src/content/schema.ts';
import type { ServiceSlug } from './services.ts';

/** คอร์สทั้ง 3 แบบตรงกับ COURSE_PACKAGES ใน backend/prisma/seed.ts */
type Course = Omit<CourseInput, 'serviceSlug'> & { serviceSlug: ServiceSlug };

export const courses = [
  {
    slug: 'face-massage-5',
    name: 'คอร์สนวดหน้าผ่อนคลาย 5 ครั้ง',
    serviceSlug: 'face-massage',
    sessions: 5,
    validDays: 90,
    price: 2500,
    bestValue: false,
    perks: [
      'ตกครั้งละ 500 บาท ประหยัด 500 บาท',
      'ใช้ได้ภายใน 90 วัน',
      'ดูจำนวนครั้งที่เหลือได้ใน LINE',
    ],
  },
  {
    slug: 'facial-treatment-10',
    name: 'คอร์สทรีตเมนต์ผิวหน้า 10 ครั้ง',
    serviceSlug: 'facial-treatment',
    sessions: 10,
    validDays: 180,
    price: 12000,
    bestValue: true,
    perks: [
      'ตกครั้งละ 1,200 บาท ประหยัด 3,000 บาท',
      'ใช้ได้ภายใน 180 วัน',
      'แจ้งเตือนทาง LINE ก่อนคอร์สหมดอายุ',
      'เลือกช่างประจำได้ทุกครั้ง',
    ],
  },
  {
    slug: 'hair-care-6',
    name: 'คอร์สดูแลเส้นผม 6 ครั้ง',
    serviceSlug: 'hair-treatment',
    sessions: 6,
    validDays: 120,
    price: 11000,
    bestValue: false,
    perks: [
      'ตกครั้งละประมาณ 1,833 บาท ประหยัด 2,200 บาท',
      'ใช้ได้ภายใน 120 วัน',
      'รวมสระ นวด และไดร์ทุกครั้ง',
    ],
  },
] satisfies Course[];
