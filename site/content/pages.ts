import type { PagesInput } from '../src/content/schema.ts';
import type { ImageId } from './images.ts';
import type { ServiceSlug } from './services.ts';

/** title และ description ของหน้าที่ไม่ได้มาจากรายการเนื้อหา ทุกค่าผ่านกฎความยาวใน schema */
type Pages = Omit<PagesInput, 'home'> & {
  home: Omit<PagesInput['home'], 'heroImage' | 'aboutImage' | 'ctaImage' | 'featuredServices'> & {
    heroImage: ImageId;
    aboutImage: ImageId;
    ctaImage: ImageId;
    featuredServices: ServiceSlug[];
  };
};

export const pages = {
  home: {
    title: 'THNP Clinic คลินิกความงาม นครราชสีมา ผิวหน้าและเส้นผม',
    description:
      'คลินิกความงามใจกลางเมืองนครราชสีมา ทรีตเมนต์ผิวหน้า นวดหน้า ทรีตเมนต์ผม ตัดผม และสระไดร์ โดยช่างประจำ เปิดทุกวัน 10:00 ถึง 20:00 จองคิวออนไลน์ได้ตลอด',
    heroImage: 'hero-lounge',
    aboutImage: 'space-treatment-room',
    ctaImage: 'hair-treatment',
    featuredServices: ['facial-treatment', 'hair-treatment', 'face-massage', 'haircut', 'eye-care'],
    featuredReviews: ['r01', 'r03', 'r07', 'r02', 'r16', 'r19'],
  },
  services: {
    title: 'บริการผิวหน้าและเส้นผม นครราชสีมา | THNP Clinic',
    description:
      'รวมบริการของ THNP Clinic ทรีตเมนต์บำรุงผิวหน้า ทำความสะอาดผิวหน้า นวดหน้า ดูแลรอบดวงตา ทรีตเมนต์ผม สระไดร์ ตัดผม และปรึกษาฟรี พร้อมราคาและระยะเวลา',
  },
  courses: {
    title: 'คอร์สทรีตเมนต์และราคา นครราชสีมา | THNP Clinic',
    description:
      'คอร์สทรีตเมนต์ผิวหน้า 10 ครั้ง คอร์สดูแลเส้นผม 6 ครั้ง และคอร์สนวดหน้า 5 ครั้ง ราคาต่อครั้งถูกลง ดูจำนวนครั้งที่เหลือและวันหมดอายุได้เองใน LINE',
  },
  team: {
    title: 'ทีมช่าง THNP Clinic นครราชสีมา',
    description:
      'รู้จักช่างของ THNP Clinic คุณแนน ช่างผู้เชี่ยวชาญผิวหน้า คุณเบส ช่างผมอาวุโส และคุณฟ้า ช่างสระไดร์และนวดหน้า เลือกช่างที่ชอบแล้วจองคิวออนไลน์ได้เลย',
  },
  gallery: {
    title: 'แกลเลอรีบรรยากาศร้าน | THNP Clinic นครราชสีมา',
    description:
      'ชมบรรยากาศภายใน THNP Clinic มุมพักรอ ห้องทรีตเมนต์เดี่ยวและห้องคู่ มุมทำผม และภาพระหว่างให้บริการผิวหน้าและเส้นผม กดที่รูปเพื่อดูแบบเต็มจอ',
  },
  reviews: {
    title: 'รีวิวจากลูกค้า | THNP Clinic นครราชสีมา',
    description:
      'อ่านรีวิวบริการผิวหน้า นวดหน้า ทรีตเมนต์ผม ตัดผม และสระไดร์ของ THNP Clinic กรองตามบริการและคะแนน รีวิวในเดโมนี้เป็นตัวอย่างและติดป้ายไว้ทุกชิ้น',
  },
  articles: {
    title: 'บทความดูแลผิวและเส้นผม | THNP Clinic',
    description:
      'บทความจากช่างของ THNP Clinic เรื่องการดูแลผิวหลังทำทรีตเมนต์ การดูแลผมทำสี และการเตรียมตัวก่อนมาคลินิกความงามครั้งแรก อ่านง่าย ใช้ได้จริงที่บ้าน',
  },
  contact: {
    title: 'ติดต่อ THNP Clinic ที่อยู่ เบอร์โทร เวลาเปิด',
    description:
      'ที่อยู่ เบอร์โทร LINE และเวลาเปิดทำการของ THNP Clinic ในเมืองนครราชสีมา เปิดทุกวัน 10:00 ถึง 20:00 จองคิวออนไลน์ได้ตลอด 24 ชั่วโมง',
  },
  privacy: {
    title: 'นโยบายความเป็นส่วนตัว | THNP Clinic',
    description:
      'นโยบายความเป็นส่วนตัวของ THNP Clinic ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล ข้อมูลที่เราเก็บเมื่อคุณจองคิว เหตุผลที่เก็บ ระยะเวลาเก็บ และสิทธิของคุณ',
  },
} satisfies Pages;
