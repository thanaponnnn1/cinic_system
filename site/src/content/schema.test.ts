import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';
import { rawContent } from '../../content/index.ts';
import { reviewsJsonLd } from '../seo/jsonld.ts';
import { claimIssues, ContentError, validateContent, type SiteMode } from './schema.ts';

type Fixture = ReturnType<typeof fixture>;

function fixture() {
  return structuredClone(rawContent) as unknown as {
    site: { isDemo: boolean };
    images: Record<string, { alt?: string; isDemo: boolean }>;
    manifest: Record<string, { width: number }>;
    services: {
      slug: string;
      faqs: unknown[];
      images: string[];
      seo: { title: string; description: string };
    }[];
    reviews: { id: string; text: string; consent: boolean; isSample: boolean; source: string }[];
    team: { slug: string }[];
    pages: { home: { featuredReviews: string[] } };
  };
}

/** ต้องล้มด้วย ContentError และมีข้อความตรงกับกฎที่ตั้งใจทดสอบ ไม่ใช่ล้มเพราะเหตุอื่น */
function assertRejects(data: Fixture, mode: SiteMode, expected: RegExp) {
  assert.throws(
    () => validateContent(data, mode),
    (error: unknown) => {
      assert.ok(error instanceof ContentError, `expected ContentError, got ${String(error)}`);
      assert.ok(
        error.issues.some((issue) => expected.test(issue)),
        `no issue matches ${expected}; got:\n${error.issues.join('\n')}`,
      );
      return true;
    },
  );
}

function stripDemo(data: Fixture) {
  data.site.isDemo = false;
  for (const image of Object.values(data.images)) image.isDemo = false;
  for (const review of data.reviews) {
    review.isSample = false;
    review.source = 'in-store';
  }
}

describe('content schema', () => {
  test('the real demo content passes', () => {
    const content = validateContent(rawContent, 'demo');
    assert.equal(content.services.length, 8);
    assert.equal(content.reviews.length, 28);
  });

  test('missing alt fails', () => {
    const data = fixture();
    delete data.images['hero-lounge'].alt;
    assertRejects(data, 'demo', /images\.hero-lounge\.alt: ทุกรูปต้องมี alt/);
  });

  test('alt shorter than 8 characters fails', () => {
    const data = fixture();
    data.images['hero-lounge'].alt = 'รูป';
    assertRejects(data, 'demo', /alt สั้นกว่า 8/);
  });

  test('duplicate alt fails', () => {
    const data = fixture();
    data.images['haircut'].alt = data.images['hero-lounge'].alt;
    assertRejects(data, 'demo', /alt ซ้ำกัน/);
  });

  test('slug with uppercase or spaces fails', () => {
    const data = fixture();
    data.services[0].slug = 'Facial Treatment';
    assertRejects(data, 'demo', /services\.0\.slug: slug ใช้ได้แค่ a-z 0-9/);
  });

  test('duplicate slug fails', () => {
    const data = fixture();
    data.team[1].slug = data.team[0].slug;
    assertRejects(data, 'demo', /team: slug ซ้ำ "nan"/);
  });

  test('a consent=false review featured on the page fails', () => {
    const data = fixture();
    const featured = data.reviews.find((r) => r.id === data.pages.home.featuredReviews[0]);
    assert.ok(featured);
    featured.consent = false;
    assertRejects(data, 'demo', /consent=false/);
  });

  test('a consent=false review never reaches the rendered review list', () => {
    const data = fixture();
    data.reviews[27].consent = false;
    const content = validateContent(data, 'demo');
    assert.equal(content.reviews.length, 27);
    assert.ok(!content.reviews.some((review) => review.id === data.reviews[27].id));
  });

  test('a sample review not flagged isSample fails (it would leak into JSON-LD)', () => {
    const data = fixture();
    data.reviews[0].isSample = false;
    assertRejects(data, 'demo', /isSample ต้องตรงกับ source/);
  });

  test('sample reviews never produce Review or AggregateRating JSON-LD', () => {
    const content = validateContent(rawContent, 'demo');
    assert.equal(reviewsJsonLd(content.reviews, content.site, 'https://x.test'), null);

    const data = fixture();
    stripDemo(data);
    data.reviews[0].isSample = true;
    data.reviews[0].source = 'sample';
    const mixed = validateContent(data, 'demo');
    const json = JSON.stringify(reviewsJsonLd(mixed.reviews, mixed.site, 'https://x.test'));
    assert.match(json, /"reviewCount":27/);
    assert.ok(!json.includes(rawContent.reviews[0].text), 'sample review text leaked');
  });

  test('SITE_MODE=live with demo content fails', () => {
    assertRejects(fixture(), 'live', /SITE_MODE=live แต่ยังมีของเดโม/);
  });

  test('SITE_MODE=live requires 1600px main images; demo mode relaxes it', () => {
    const data = fixture();
    stripDemo(data);
    assertRejects(
      data,
      'live',
      /pages\.home\.heroImage: รูป hero-lounge กว้าง 1472px ต้องอย่างน้อย 1600px/,
    );
    assert.doesNotThrow(() => validateContent(data, 'demo'));
  });

  test('a service with fewer than 3 FAQs fails', () => {
    const data = fixture();
    data.services[2].faqs = data.services[2].faqs.slice(0, 2);
    assertRejects(data, 'demo', /services\.2\.faqs: บริการต้องมีคำถามที่พบบ่อยอย่างน้อย 3 ข้อ/);
  });

  test('a service with fewer than 4 images fails', () => {
    const data = fixture();
    data.services[1].images = data.services[1].images.slice(0, 3);
    assertRejects(data, 'demo', /services\.1\.images: บริการต้องมีรูปอย่างน้อย 4 รูป/);
  });

  test('title over 60 and description under 70 characters fail', () => {
    const data = fixture();
    data.services[0].seo.title = 'ก'.repeat(61);
    assertRejects(data, 'demo', /title ยาวเกิน 60/);
    const short = fixture();
    short.services[0].seo.description = 'สั้นไป';
    assertRejects(short, 'demo', /description สั้นกว่า 70/);
  });

  test('a reference to an unknown image fails', () => {
    const data = fixture();
    data.services[0].images[0] = 'serenity-spa-counter';
    assertRejects(data, 'demo', /ไม่รู้จักรูป "serenity-spa-counter"/);
  });

  test('alt over 125 and description over 160 characters fail', () => {
    const data = fixture();
    data.images['haircut'].alt = 'ก'.repeat(126);
    assertRejects(data, 'demo', /alt ยาวเกิน 125/);
    const long = fixture();
    long.services[0].seo.description = 'ก'.repeat(161);
    assertRejects(long, 'demo', /description ยาวเกิน 160/);
  });

  test('a guaranteed-result or medical claim in content fails, an honest negation passes', () => {
    const data = fixture();
    data.reviews[3].text = 'ทำแล้วหน้าขาวใสทันที ประทับใจมากค่ะ';
    assertRejects(data, 'demo', /reviews\[3\]\.text: มีคำอวดอ้างผลลัพธ์ "ขาวใส"/);
    const guaranteed = fixture();
    guaranteed.services[0].seo.description += ' การันตี';
    assertRejects(guaranteed, 'demo', /"การันตี"/);
    assert.deepEqual(claimIssues('ช่างไม่รับประกันผลลัพธ์', 'x'), []);
  });

  test('no article body makes a guaranteed-result or medical claim', async () => {
    const dir = new URL('../../content/articles/', import.meta.url);
    const files = (await readdir(dir)).filter((file) => file.endsWith('.mdx'));
    assert.equal(files.length, rawContent.articles.length, 'one .mdx file per article entry');
    for (const file of files) {
      const body = await readFile(new URL(file, dir), 'utf8');
      assert.deepEqual(claimIssues(body, file), []);
      assert.ok(!/^# /m.test(body), `${file}: the page already has an h1, use ## in MDX`);
    }
  });
});
