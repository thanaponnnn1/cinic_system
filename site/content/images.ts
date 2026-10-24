import type { ImageInput } from '../src/content/schema.ts';

/**
 * alt ของทุกรูป เขียนตามสิ่งที่เห็นในรูปจริง ไม่อวดผลลัพธ์
 * ขนาดไฟล์มาจาก images.manifest.json ที่ scripts/prepare-images.mjs สร้าง
 * isDemo: true = รูปเดโมจากคลังภาพ ไม่ใช่รูปร้านจริง ห้ามขึ้นเว็บจริง (SITE_MODE=live จะ build ล้ม)
 */
export const images = {
  'hero-lounge': {
    alt: 'มุมพักรอโทนครีมอุ่น ซุ้มโค้งเปิดไฟสลัว ต้นมะกอกในกระถาง และเทียนบนโต๊ะกลาง',
    isDemo: true,
    focus: '50% 45%',
  },
  'lounge-arch-niche': {
    alt: 'ซุ้มโค้งบนผนังปูนขัดมันพร้อมต้นไม้และไฟซ่อนขอบสีทอง',
    isDemo: true,
  },
  'lounge-candle-table': {
    alt: 'โซฟาผ้าลินินสีขาวรอบโต๊ะกลางที่วางเทียนและถาดผลไม้',
    isDemo: true,
  },
  'space-counter': {
    alt: 'เคาน์เตอร์โค้งยาวสีครีมพร้อมเก้าอี้สตูลและโคมไฟโต๊ะเรียงเป็นแถว',
    isDemo: true,
  },
  'space-treatment-room': {
    alt: 'ห้องทรีตเมนต์เดี่ยว เตียงปรับระดับสีครีม กระจกกลมเปิดไฟด้านหลัง',
    isDemo: true,
    focus: '50% 60%',
  },
  'treatment-room-vanity': {
    alt: 'อ่างล้างหน้าไม้วอลนัทใต้กระจกกลมที่มีไฟเรืองรอบขอบ',
    isDemo: true,
  },
  'treatment-room-bed': {
    alt: 'เตียงทรีตเมนต์พับผ้าขนหนูขาววางเตรียมไว้ข้างผ้าม่าน',
    isDemo: true,
  },
  'space-twin-room': {
    alt: 'ห้องทรีตเมนต์คู่ผนังสีอิฐ เตียงสองเตียงคลุมผ้าสีส้มอิฐ',
    isDemo: true,
  },
  'twin-room-candles': {
    alt: 'ซุ้มโค้งวางหินและเทียน กับโต๊ะกลมเล็กระหว่างเตียงสองเตียง',
    isDemo: true,
  },
  'space-pedicure-lounge': {
    alt: 'มุมแช่เท้าที่โซฟาโค้งปูนเปลือย มีลูกค้านั่งพักและพนักงานกำลังดูแล',
    isDemo: true,
  },
  'space-hair-studio': {
    alt: 'ห้องที่รวมเตียงดูแลผิวและเก้าอี้ทำผม คั่นด้วยผ้าม่านโปร่ง',
    isDemo: true,
  },
  'hair-studio-chair': {
    alt: 'เก้าอี้ทำผมสีครีมหน้ากระจกโค้งและพรมกลมสีขาว',
    isDemo: true,
  },
  'hair-studio-bed': {
    alt: 'เตียงดูแลผิวข้างชั้นวางผลิตภัณฑ์และไฟวงแหวน',
    isDemo: true,
  },
  'facial-treatment': {
    alt: 'ช่างกำลังทำทรีตเมนต์ผิวหน้าให้ลูกค้าที่นอนห่มผ้าขนหนูขาว ข้างเตียงมีเทียนและหินร้อน',
    isDemo: true,
    focus: '50% 55%',
  },
  'facial-treatment-therapist': {
    alt: 'มือช่างประคองใบหน้าลูกค้าระหว่างทำทรีตเมนต์ ชั้นหลังมีขวดผลิตภัณฑ์เรียง',
    isDemo: true,
  },
  'facial-treatment-tray': {
    alt: 'ถาดหวายวางเทียน ขวดน้ำมัน และหินสีดำบนโต๊ะหินอ่อน',
    isDemo: true,
  },
  'facial-cleansing': {
    alt: 'ช่างสวมถุงมือทำความสะอาดผิวหน้าให้ลูกค้าที่นอนบนเตียงทรีตเมนต์',
    isDemo: true,
    focus: '50% 62%',
  },
  'facial-cleansing-therapist': {
    alt: 'ช่างในชุดยูนิฟอร์มสีเทาฟ้าก้มดูผิวลูกค้าอย่างตั้งใจ',
    isDemo: true,
  },
  'facial-cleansing-hands': {
    alt: 'มือในถุงมือเกลี่ยโฟมล้างหน้าบนผิวลูกค้าที่หลับตาพัก',
    isDemo: true,
  },
  'face-massage': {
    alt: 'ลูกค้านอนหลับตาขณะช่างนวดศีรษะและใบหน้า ข้างกันมีเทียนจุดไว้',
    isDemo: true,
  },
  'eye-care': {
    alt: 'ลูกค้าพอกมาสก์สีเขียวอ่อนและวางแตงกวาบนดวงตา นอนบนผ้าขนหนู',
    isDemo: true,
    focus: '50% 35%',
  },
  'eye-care-mask': {
    alt: 'ใบหน้าที่พอกมาสก์และวางแตงกวาสองแผ่นปิดตา',
    isDemo: true,
  },
  'eye-care-tray': {
    alt: 'ถาดหินวางขวดเซรั่ม ถ้วยกลีบกุหลาบ และชาร้อนสองถ้วย',
    isDemo: true,
  },
  'hair-treatment': {
    alt: 'ลูกค้าปิดตาด้วยผ้าขณะช่างสระผมที่อ่างพร้อมฝักบัวโค้งสีทอง',
    isDemo: true,
    focus: '50% 45%',
  },
  'hair-treatment-wash': {
    alt: 'มือช่างนวดหนังศีรษะใต้สายน้ำอุ่นจากฝักบัวโค้ง',
    isDemo: true,
  },
  'wash-blowdry': {
    alt: 'ช่างเป่าผมยาวสีน้ำตาลให้ลูกค้าหน้ากระจกโค้งที่มีไฟรอบขอบ',
    isDemo: true,
    focus: '50% 40%',
  },
  haircut: {
    alt: 'ช่างใช้หวีและกรรไกรตัดปลายผมลูกค้าที่หลับตานั่งนิ่ง',
    isDemo: true,
    focus: '50% 40%',
  },
  'haircut-scissors': {
    alt: 'มือถือกรรไกรตัดผมและหวีระหว่างเล็มปอยผมสีเข้ม',
    isDemo: true,
  },
  'haircut-client': {
    alt: 'ลูกค้าผมสีน้ำตาลเข้มซอยเป็นชั้นหลับตาขณะช่างเก็บทรง',
    isDemo: true,
  },
  'hair-styling': {
    alt: 'ช่างผมมวยสูงจัดลอนผมยาวให้ลูกค้าที่นั่งหน้ากระจก',
    isDemo: true,
    focus: '50% 35%',
  },
  'styling-shelves': {
    alt: 'ชั้นเหล็กสีดำวางขวดผลิตภัณฑ์ดูแลผมเรียงหลายแถว',
    isDemo: true,
  },
  'staff-nan': {
    alt: 'คุณแนนในยูนิฟอร์มสีขาวยิ้มหน้าชั้นวางผลิตภัณฑ์',
    isDemo: true,
    focus: '50% 30%',
  },
  'staff-best': {
    alt: 'คุณเบสผมมวยสูงกำลังจัดทรงผมลูกค้า',
    isDemo: true,
  },
  'staff-fah': {
    alt: 'คุณฟ้าผมยาวสีน้ำตาลกำลังเป่าผมให้ลูกค้า',
    isDemo: true,
  },
  'review-portrait-1': {
    alt: 'รูปโปรไฟล์ผู้รีวิว ผมยาวสีน้ำตาลลอนอ่อน',
    isDemo: true,
  },
  'review-portrait-2': {
    alt: 'รูปโปรไฟล์ผู้รีวิว ผมดำยาวรวบครึ่งหัว',
    isDemo: true,
  },
} satisfies Record<string, ImageInput>;

export type ImageId = keyof typeof images;
