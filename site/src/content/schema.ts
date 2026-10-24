import { z } from 'zod';

/**
 * schema ของเนื้อหาทั้งเว็บ + กฎ SEO ที่บังคับด้วยโค้ด (แผน §7) ผิดข้อไหน build ล้มพร้อมรายการทุกข้อ
 *
 * ไฟล์นี้ต้องไม่ import อะไรของ Next เพราะ node:test รันมันตรง ๆ
 */

export const SITE_MODES = ['demo', 'live'] as const;
export type SiteMode = (typeof SITE_MODES)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;
const ALT_MIN = 8;
const ALT_MAX = 125;
const MIN_FAQS = 3;
const MIN_SERVICE_IMAGES = 4;
/**
 * รูป hero และรูปหลักของบริการต้องกว้างอย่างน้อย 1600px เฉพาะ SITE_MODE=live
 * โหมด demo ผ่อนกฎนี้ เพราะรูปเดโมต้นฉบับกว้าง 736px และถูกขยาย 2 เท่าด้วย lanczos (ได้ 1472px)
 * การขยายไม่เพิ่มรายละเอียดจริง รูปเดโมจึงห้ามขึ้นเว็บจริงอยู่แล้ว (ดูกฎ live ด้านล่าง)
 */
const LIVE_MIN_MAIN_WIDTH = 1600;

/**
 * คำอวดผลการรักษาหรือรับประกันผลลัพธ์ ห้ามมีในเนื้อหา (ร้านเสริมสวยอ้างผลทางการแพทย์ไม่ได้)
 * ประโยคปฏิเสธอย่าง "ไม่รับประกันผลลัพธ์" ผ่านได้ เพราะเป็นการบอกตรง ๆ ว่าไม่สัญญา
 */
const CLAIM =
  /(?<!ไม่)(รับประกันผล|การันตี|หายขาด|ถาวร|เห็นผลทันที|ขาวใส|ลดริ้วรอย|รักษาสิว|รักษาฝ้า|100\s?%)/;

/** คืนรายการคำอวดอ้างที่พบใน text ใช้ทั้งกับเนื้อหาใน content/*.ts และไฟล์บทความ MDX */
export function claimIssues(text: string, where: string): string[] {
  const match = text.match(CLAIM);
  return match ? [`${where}: มีคำอวดอ้างผลลัพธ์ "${match[0]}" ห้ามใช้`] : [];
}

function strings(value: unknown, where: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === 'string') out.push([where, value]);
  else if (Array.isArray(value)) value.forEach((item, i) => strings(item, `${where}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) strings(item, `${where}.${key}`, out);
  }
  return out;
}

const slug = z.string().regex(SLUG, 'slug ใช้ได้แค่ a-z 0-9 และขีดกลาง');
const isoDate = z.iso.date();

const seo = z.object({
  title: z.string().min(10).max(TITLE_MAX, `title ยาวเกิน ${TITLE_MAX} ตัวอักษร`),
  description: z
    .string()
    .min(DESCRIPTION_MIN, `description สั้นกว่า ${DESCRIPTION_MIN} ตัวอักษร`)
    .max(DESCRIPTION_MAX, `description ยาวเกิน ${DESCRIPTION_MAX} ตัวอักษร`),
});

const imageEntry = z.object({
  alt: z
    .string({ error: 'ทุกรูปต้องมี alt' })
    .trim()
    .min(ALT_MIN, `alt สั้นกว่า ${ALT_MIN} ตัวอักษร`)
    .max(ALT_MAX, `alt ยาวเกิน ${ALT_MAX} ตัวอักษร`),
  isDemo: z.boolean(),
  /** object-position เวลาครอปด้วย object-cover เช่น "50% 30%" */
  focus: z.string().optional(),
});

const manifestEntry = z.object({
  src: z.string().startsWith('/images/'),
  width: z.int().positive(),
  height: z.int().positive(),
  /** ความกว้างจริงของรูปต้นฉบับก่อนขยาย ใช้บอกว่ารูปนี้คมได้แค่ไหน */
  sourceWidth: z.int().positive(),
  bytes: z.int().positive(),
});

const faq = z.object({ q: z.string().min(5), a: z.string().min(20) });
const step = z.object({ title: z.string().min(2), body: z.string().min(10) });

const siteSchema = z.object({
  isDemo: z.boolean(),
  name: z.string().min(2),
  tagline: z.string().min(5),
  description: z.string().min(20),
  businessType: z.enum(['BeautySalon', 'MedicalClinic']),
  province: z.string().min(2),
  address: z.object({
    street: z.string(),
    subdistrict: z.string(),
    district: z.string(),
    province: z.string(),
    postalCode: z.string().regex(/^\d{5}$/),
  }),
  phone: z.string().regex(/^0[\d-]{8,11}$/),
  hours: z.object({
    open: z.string().regex(/^\d\d:\d\d$/),
    close: z.string().regex(/^\d\d:\d\d$/),
  }),
  lineUrl: z.url(),
  geo: z.object({ lat: z.number(), lng: z.number() }),
  openedYear: z.int().min(1990),
  priceRange: z.string(),
});

const serviceSchema = z.object({
  slug,
  name: z.string().min(2),
  category: z.enum(['face', 'hair', 'consult']),
  price: z.int().nonnegative(),
  durationMin: z.int().positive(),
  summary: z.string().min(10).max(90),
  intro: z.string().min(80),
  images: z
    .array(z.string())
    .min(MIN_SERVICE_IMAGES, `บริการต้องมีรูปอย่างน้อย ${MIN_SERVICE_IMAGES} รูป`),
  suitableFor: z.array(z.string()).min(2),
  steps: z.array(step).min(3),
  aftercare: z.array(z.string()).min(2),
  faqs: z.array(faq).min(MIN_FAQS, `บริการต้องมีคำถามที่พบบ่อยอย่างน้อย ${MIN_FAQS} ข้อ`),
  seo,
});

const courseSchema = z.object({
  slug,
  name: z.string().min(2),
  serviceSlug: slug,
  sessions: z.int().positive(),
  validDays: z.int().positive(),
  price: z.int().positive(),
  bestValue: z.boolean(),
  perks: z.array(z.string()).min(2),
});

const memberSchema = z.object({
  slug,
  name: z.string().min(2),
  latinName: z.string().regex(/^[A-Z]+$/),
  role: z.string().min(2),
  years: z.int().positive(),
  image: z.string(),
  intro: z.string().min(20),
  bio: z.array(z.string().min(20)).min(2),
  specialties: z.array(slug).min(1),
  seo,
});

const reviewSchema = z
  .object({
    id: slug,
    text: z.string().min(15),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    serviceSlug: slug,
    authorDisplay: z.string().min(2),
    date: isoDate,
    source: z.enum(['line-after-visit', 'in-store', 'sample']),
    consent: z.boolean(),
    isSample: z.boolean(),
    avatar: z.string().optional(),
  })
  .refine((review) => review.isSample === (review.source === 'sample'), {
    message: 'isSample ต้องตรงกับ source: "sample" เสมอ ไม่งั้นรีวิวตัวอย่างอาจหลุดออก JSON-LD',
    path: ['isSample'],
  });

const articleSchema = z.object({
  slug,
  title: z.string().min(10),
  excerpt: z.string().min(30),
  date: isoDate,
  cover: z.string(),
  relatedServices: z.array(slug).min(1),
  seo,
});

const galleryTile = z.object({
  image: z.string(),
  category: z.enum(['space', 'face', 'hair', 'team']),
});

const pagesSchema = z.object({
  home: seo.extend({
    heroImage: z.string(),
    aboutImage: z.string(),
    ctaImage: z.string(),
    featuredServices: z.array(slug).length(5),
    featuredReviews: z.array(slug).min(3),
  }),
  services: seo,
  courses: seo,
  team: seo,
  gallery: seo,
  reviews: seo,
  articles: seo,
  contact: seo,
  privacy: seo,
});

export const rawContentSchema = z.object({
  site: siteSchema,
  images: z.record(z.string(), imageEntry),
  manifest: z.record(z.string(), manifestEntry),
  gallery: z.array(galleryTile).min(1),
  services: z.array(serviceSchema).min(1),
  courses: z.array(courseSchema),
  team: z.array(memberSchema).min(1),
  reviews: z.array(reviewSchema),
  articles: z.array(articleSchema),
  pages: pagesSchema,
});

export type RawContent = z.input<typeof rawContentSchema>;
type Parsed = z.output<typeof rawContentSchema>;

export type ImageInput = z.input<typeof imageEntry>;
export type SiteInput = z.input<typeof siteSchema>;
export type ServiceInput = z.input<typeof serviceSchema>;
export type CourseInput = z.input<typeof courseSchema>;
export type MemberInput = z.input<typeof memberSchema>;
export type ReviewInput = z.input<typeof reviewSchema>;
export type ArticleInput = z.input<typeof articleSchema>;
export type GalleryTileInput = z.input<typeof galleryTile>;
export type PagesInput = z.input<typeof pagesSchema>;

export type Image = z.output<typeof imageEntry> &
  z.output<typeof manifestEntry> & {
    id: string;
  };
export type Seo = z.output<typeof seo>;
export type Site = Parsed['site'];
export type Service = Omit<Parsed['services'][number], 'images'> & { images: Image[] };
export type Course = Parsed['courses'][number];
export type Member = Omit<Parsed['team'][number], 'image'> & { image: Image };
export type Review = Omit<Parsed['reviews'][number], 'avatar'> & { avatar?: Image };
export type Article = Omit<Parsed['articles'][number], 'cover'> & { cover: Image };
export type GalleryTile = { image: Image; category: Parsed['gallery'][number]['category'] };
export type Pages = Omit<Parsed['pages'], 'home'> & {
  home: Omit<Parsed['pages']['home'], 'heroImage' | 'aboutImage' | 'ctaImage'> & {
    heroImage: Image;
    aboutImage: Image;
    ctaImage: Image;
  };
};

export type Content = {
  mode: SiteMode;
  site: Site;
  images: Record<string, Image>;
  gallery: GalleryTile[];
  services: Service[];
  courses: Course[];
  team: Member[];
  /** เฉพาะรีวิวที่ consent=true รีวิวที่ไม่ยินยอมไม่มีทางถึงหน้าเว็บ */
  reviews: Review[];
  articles: Article[];
  pages: Pages;
};

export class ContentError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`เนื้อหาเว็บผิดกฎ ${issues.length} ข้อ:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ContentError';
    this.issues = issues;
  }
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** กฎที่ต้องดูหลายไฟล์พร้อมกัน คืนรายการปัญหาเป็นข้อความ ว่างแปลว่าผ่าน */
function crossRules(c: Parsed, mode: SiteMode): string[] {
  const issues: string[] = [];
  const imageIds = new Set(Object.keys(c.images));
  const serviceSlugs = new Set(c.services.map((s) => s.slug));
  const reviewsById = new Map(c.reviews.map((r) => [r.id, r]));

  for (const id of imageIds) {
    if (!c.manifest[id])
      issues.push(`images.${id}: ไม่มีไฟล์ใน images.manifest.json (รัน pnpm images)`);
  }
  for (const id of Object.keys(c.manifest)) {
    if (!imageIds.has(id))
      issues.push(`images.manifest.json: ${id} ไม่มี alt ใน content/images.ts`);
  }
  const { manifest: _manifest, ...texts } = c;
  for (const [where, text] of strings(texts, 'content')) issues.push(...claimIssues(text, where));
  for (const alt of duplicates(Object.values(c.images).map((image) => image.alt))) {
    issues.push(`alt ซ้ำกัน: "${alt}"`);
  }

  const imageRef = (where: string, id: string | undefined) => {
    if (id !== undefined && !imageIds.has(id)) issues.push(`${where}: ไม่รู้จักรูป "${id}"`);
  };
  const serviceRef = (where: string, value: string) => {
    if (!serviceSlugs.has(value)) issues.push(`${where}: ไม่รู้จักบริการ "${value}"`);
  };

  for (const [kind, slugs] of [
    ['services', c.services.map((s) => s.slug)],
    ['team', c.team.map((m) => m.slug)],
    ['articles', c.articles.map((a) => a.slug)],
    ['courses', c.courses.map((x) => x.slug)],
    ['reviews', c.reviews.map((r) => r.id)],
  ] as const) {
    for (const value of duplicates([...slugs])) issues.push(`${kind}: slug ซ้ำ "${value}"`);
  }

  c.gallery.forEach((tile, i) => imageRef(`gallery[${i}]`, tile.image));
  for (const s of c.services) s.images.forEach((id) => imageRef(`services.${s.slug}.images`, id));
  for (const m of c.team) {
    imageRef(`team.${m.slug}.image`, m.image);
    m.specialties.forEach((value) => serviceRef(`team.${m.slug}.specialties`, value));
  }
  for (const x of c.courses) serviceRef(`courses.${x.slug}`, x.serviceSlug);
  for (const r of c.reviews) {
    serviceRef(`reviews.${r.id}`, r.serviceSlug);
    imageRef(`reviews.${r.id}.avatar`, r.avatar);
  }
  for (const a of c.articles) {
    imageRef(`articles.${a.slug}.cover`, a.cover);
    a.relatedServices.forEach((value) => serviceRef(`articles.${a.slug}`, value));
  }
  const home = c.pages.home;
  imageRef('pages.home.heroImage', home.heroImage);
  imageRef('pages.home.aboutImage', home.aboutImage);
  imageRef('pages.home.ctaImage', home.ctaImage);
  home.featuredServices.forEach((value) => serviceRef('pages.home.featuredServices', value));
  for (const id of home.featuredReviews) {
    const review = reviewsById.get(id);
    if (!review) issues.push(`pages.home.featuredReviews: ไม่รู้จักรีวิว "${id}"`);
    else if (!review.consent)
      issues.push(`รีวิว ${id} ไม่ได้รับความยินยอม (consent=false) ห้ามแสดง`);
  }

  if (mode === 'live') {
    const demo: string[] = [];
    if (c.site.isDemo) demo.push('site.ts (ข้อมูลร้านสมมติ)');
    for (const [id, image] of Object.entries(c.images)) if (image.isDemo) demo.push(`รูป ${id}`);
    for (const r of c.reviews) if (r.isSample) demo.push(`รีวิวตัวอย่าง ${r.id}`);
    if (demo.length > 0) {
      issues.push(
        `SITE_MODE=live แต่ยังมีของเดโม ${demo.length} ชิ้น: ${demo.slice(0, 8).join(', ')}${demo.length > 8 ? ' …' : ''}`,
      );
    }
    const mainImages = [
      ['pages.home.heroImage', home.heroImage],
      ...c.services.map((s) => [`services.${s.slug} รูปหลัก`, s.images[0]] as const),
    ] as const;
    for (const [where, id] of mainImages) {
      const width = c.manifest[id]?.width ?? 0;
      if (width < LIVE_MIN_MAIN_WIDTH) {
        issues.push(`${where}: รูป ${id} กว้าง ${width}px ต้องอย่างน้อย ${LIVE_MIN_MAIN_WIDTH}px`);
      }
    }
  }

  return issues;
}

function resolve(c: Parsed, mode: SiteMode): Content {
  const images: Record<string, Image> = {};
  for (const [id, entry] of Object.entries(c.images))
    images[id] = { id, ...entry, ...c.manifest[id] };
  const image = (id: string) => images[id];

  return {
    mode,
    site: c.site,
    images,
    gallery: c.gallery.map((tile) => ({ image: image(tile.image), category: tile.category })),
    services: c.services.map((s) => ({ ...s, images: s.images.map(image) })),
    courses: c.courses,
    team: c.team.map((m) => ({ ...m, image: image(m.image) })),
    reviews: c.reviews
      .filter((r) => r.consent)
      .map(({ avatar, ...r }) => (avatar ? { ...r, avatar: image(avatar) } : r)),
    articles: c.articles.map((a) => ({ ...a, cover: image(a.cover) })),
    pages: {
      ...c.pages,
      home: {
        ...c.pages.home,
        heroImage: image(c.pages.home.heroImage),
        aboutImage: image(c.pages.home.aboutImage),
        ctaImage: image(c.pages.home.ctaImage),
      },
    },
  };
}

/** ตรวจเนื้อหาทั้งหมดตามกฎ §7 แล้วคืนข้อมูลที่ตรวจแล้ว ผิดข้อไหนโยน ContentError พร้อมทุกข้อ */
export function validateContent(raw: unknown, mode: SiteMode): Content {
  const parsed = rawContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(
      parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const issues = crossRules(parsed.data, mode);
  if (issues.length > 0) throw new ContentError(issues);
  return resolve(parsed.data, mode);
}
