import type { Article, Review, Service, Site } from '../content/schema.ts';

/**
 * ตัวประกอบ JSON-LD เป็นฟังก์ชันบริสุทธิ์ รับข้อมูลที่ตรวจแล้ว คืน object ตาม schema.org
 * ไม่ import อะไรของ Next เพื่อให้ node:test เรียกตรงได้
 */

type Json = Record<string, unknown>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function businessJsonLd(site: Site, siteUrl: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': site.businessType,
    '@id': `${siteUrl}/#business`,
    name: site.name,
    description: site.description,
    url: siteUrl,
    telephone: site.phone,
    priceRange: site.priceRange,
    image: `${siteUrl}/images/hero-lounge.webp`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: `${site.address.subdistrict} ${site.address.district}`,
      addressRegion: site.address.province,
      postalCode: site.address.postalCode,
      addressCountry: 'TH',
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAYS,
      opens: site.hours.open,
      closes: site.hours.close,
    },
    sameAs: [site.lineUrl],
  };
}

export function serviceJsonLd(service: Service, siteUrl: string): Json {
  const url = `${siteUrl}/services/${service.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.name,
    description: service.seo.description,
    url,
    image: service.images.slice(0, 4).map((image) => `${siteUrl}${image.src}`),
    serviceType: service.name,
    areaServed: 'นครราชสีมา',
    provider: { '@id': `${siteUrl}/#business` },
    offers: {
      '@type': 'Offer',
      price: service.price,
      priceCurrency: 'THB',
      availability: 'https://schema.org/InStock',
      url,
    },
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[], siteUrl: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path === '/' ? '' : crumb.path}`,
    })),
  };
}

export function articleJsonLd(article: Article, site: Site, siteUrl: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seo.description,
    datePublished: article.date,
    dateModified: article.date,
    image: [`${siteUrl}${article.cover.src}`],
    mainEntityOfPage: `${siteUrl}/articles/${article.slug}`,
    author: { '@type': 'Organization', name: site.name, url: siteUrl },
    publisher: { '@id': `${siteUrl}/#business` },
    inLanguage: 'th',
  };
}

/** รีวิวที่ออก JSON-LD ได้ ต้องยินยอมแล้วและไม่ใช่รีวิวตัวอย่าง (แผน §6) */
export function structuredReviews(reviews: Review[]): Review[] {
  return reviews.filter((review) => review.consent && !review.isSample);
}

/**
 * Review + AggregateRating ของธุรกิจ คืน null เมื่อไม่มีรีวิวที่ออกได้ (โหมดเดโมจะได้ null เสมอ)
 * Google ไม่แสดงดาวจากรีวิวที่ธุรกิจเก็บเองบนเว็บตัวเอง ค่านี้มีไว้ให้ข้อมูลถูกต้อง ไม่ใช่เพื่อดาวในผลค้นหา
 */
export function reviewsJsonLd(reviews: Review[], site: Site, siteUrl: string): Json | null {
  const eligible = structuredReviews(reviews);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, review) => sum + review.rating, 0);
  return {
    '@context': 'https://schema.org',
    '@type': site.businessType,
    '@id': `${siteUrl}/#business`,
    name: site.name,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number((total / eligible.length).toFixed(1)),
      reviewCount: eligible.length,
      bestRating: 5,
    },
    review: eligible.map((review) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
      author: { '@type': 'Person', name: review.authorDisplay },
      datePublished: review.date,
      reviewBody: review.text,
    })),
  };
}
