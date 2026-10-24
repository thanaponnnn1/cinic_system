import type { ArticleInput } from '../src/content/schema.ts';
import type { ImageId } from './images.ts';
import type { ServiceSlug } from './services.ts';

/**
 * ข้อมูลของบทความ เนื้อหาอยู่ใน content/articles/<slug>.mdx
 * เพิ่มบทความใหม่ = เพิ่มรายการที่นี่ + ไฟล์ mdx ชื่อเดียวกับ slug
 */
type Article = Omit<ArticleInput, 'cover' | 'relatedServices'> & {
  cover: ImageId;
  relatedServices: ServiceSlug[];
};

export const articles = [
  {
    slug: 'skin-care-after-facial',
    title: 'ดูแลผิวหลังทำทรีตเมนต์หน้าอย่างไรให้ผิวสบายไปอีกหลายวัน',
    excerpt:
      'สามวันแรกหลังทำทรีตเมนต์คือช่วงที่ผิวต้องการความอ่อนโยนที่สุด นี่คือสิ่งที่ควรทำ สิ่งที่ควรเลี่ยง และคำถามที่ลูกค้าถามเราบ่อย',
    date: '2026-10-01',
    cover: 'facial-treatment-tray',
    relatedServices: ['facial-treatment', 'facial-cleansing', 'eye-care'],
    seo: {
      title: 'ดูแลผิวหลังทำทรีตเมนต์หน้า ทำอะไรได้บ้าง | THNP Clinic',
      description:
        'คู่มือดูแลผิวหลังทำทรีตเมนต์หน้าใน 3 วันแรก ล้างหน้าอย่างไร แต่งหน้าได้เมื่อไหร่ กันแดดสำคัญแค่ไหน และสัญญาณที่ควรทักหาช่าง จากช่างของ THNP Clinic',
    },
  },
  {
    slug: 'hair-care-after-coloring',
    title: 'ผมทำสีบ่อย ดูแลอย่างไรให้ผมไม่แห้งเสีย',
    excerpt:
      'ทำสีผมสวยแล้วอยากให้สีอยู่นานและผมยังนุ่ม เราสรุปวิธีสระ การใช้ความร้อน และจังหวะทำทรีตเมนต์ที่ช่างผมของเราใช้กับลูกค้าประจำ',
    date: '2026-09-15',
    cover: 'hair-treatment-wash',
    relatedServices: ['hair-treatment', 'wash-blowdry', 'haircut'],
    seo: {
      title: 'ผมทำสีบ่อย ดูแลอย่างไรให้ไม่แห้งเสีย | THNP Clinic',
      description:
        'วิธีดูแลผมทำสีให้สีอยู่นานและผมไม่แห้งเสีย ตั้งแต่อุณหภูมิน้ำตอนสระ การใช้ไดร์และเครื่องหนีบ ไปจนถึงจังหวะทำทรีตเมนต์ผม จากช่างผมของ THNP Clinic โคราช',
    },
  },
  {
    slug: 'first-visit-guide',
    title: 'มาครั้งแรกต้องรู้อะไรบ้าง เตรียมตัวก่อนมาคลินิกความงาม',
    excerpt:
      'จองอย่างไร ควรมาก่อนกี่นาที ต้องล้างหน้ามาไหม และถ้ายังไม่รู้จะเลือกบริการไหนควรทำอย่างไร ทุกอย่างที่ลูกค้าใหม่ถามเราบ่อยอยู่ในบทความนี้',
    date: '2026-08-20',
    cover: 'lounge-arch-niche',
    relatedServices: ['consult', 'facial-cleansing', 'face-massage'],
    seo: {
      title: 'มาคลินิกความงามครั้งแรก เตรียมตัวอย่างไร | THNP Clinic',
      description:
        'คู่มือสำหรับลูกค้าใหม่ จองคิวออนไลน์อย่างไร ควรมาก่อนนัดกี่นาที ต้องล้างหน้ามาไหม ถ้าแพ้ง่ายต้องบอกอะไร และทำไมควรเริ่มจากการปรึกษาฟรี ที่ THNP Clinic',
    },
  },
] satisfies Article[];
