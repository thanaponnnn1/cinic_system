import { AppShell } from '@/components/app-shell';

/**
 * โครงของทุกหน้าที่ต้องเข้าสู่ระบบก่อน
 *
 * ตัวกันทางใน src/proxy.ts เป็นคนเช็คเซสชันก่อนถึงตรงนี้แล้ว ที่นี่จึงไม่ต้องเช็คซ้ำ
 * มีหน้าที่แค่วางเมนูกับแถบบนให้ทุกหน้าเหมือนกัน
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
