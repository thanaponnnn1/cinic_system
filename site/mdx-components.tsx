import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

/** ลิงก์ภายในในบทความ MDX ใช้ next/link (โหลดหน้าถัดไปล่วงหน้า) ลิงก์ภายนอกเปิดแท็บเดิมตามปกติ */
const components: MDXComponents = {
  a: ({ href = '', children }) =>
    href.startsWith('/') ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
