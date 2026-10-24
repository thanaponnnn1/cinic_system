import { articles } from './articles.ts';
import { courses } from './courses.ts';
import { gallery } from './gallery.ts';
import { images } from './images.ts';
import manifest from './images.manifest.json' with { type: 'json' };
import { pages } from './pages.ts';
import { reviews } from './reviews.ts';
import { services } from './services.ts';
import { site } from './site.ts';
import { team } from './team.ts';

/** เนื้อหาดิบทั้งหมดก่อนตรวจ ใช้ผ่าน src/content/load.ts เท่านั้น (ยกเว้นในเทสต์) */
export const rawContent = {
  site,
  images,
  manifest,
  gallery,
  services,
  courses,
  team,
  reviews,
  articles,
  pages,
};
