import { BRAND_INFO, BUSINESS_HOURS } from '@clinicq/shared';
import type { SiteInput } from '../src/content/schema.ts';

/**
 * ข้อมูลร้านสมมติสำหรับเดโม ที่อยู่ เบอร์ พิกัด และลิงก์ LINE ไม่ใช่ของจริง
 * ส่งมอบเว็บจริงต้องแก้ทุกช่องให้ตรงกับ Google Business Profile ทุกตัวอักษร แล้วตั้ง isDemo: false
 */
export const site = {
  isDemo: true,
  name: BRAND_INFO.name,
  tagline: 'ดูแลผิวหน้าและเส้นผมอย่างใจเย็น โดยช่างประจำที่รู้จักคุณ',
  description:
    'คลินิกดูแลผิวหน้าและเส้นผมในเมืองนครราชสีมา บรรยากาศสงบ ช่างประจำที่รู้จักผิวและผมของคุณ จองคิวออนไลน์ได้ตลอด 24 ชั่วโมง',
  businessType: 'BeautySalon',
  province: 'นครราชสีมา',
  address: {
    street: '123 ถนนตัวอย่าง',
    subdistrict: 'ต.ในเมือง',
    district: 'อ.เมือง',
    province: 'จ.นครราชสีมา',
    postalCode: '30000',
  },
  phone: '044-000-000',
  hours: { open: BUSINESS_HOURS.open, close: BUSINESS_HOURS.close },
  lineUrl: 'https://line.me/R/ti/p/@thnp-demo',
  geo: { lat: 14.9799, lng: 102.0978 },
  openedYear: 2019,
  priceRange: '฿฿',
} satisfies SiteInput;
