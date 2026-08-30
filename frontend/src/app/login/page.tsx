'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { BRAND_INFO } from '@clinicq/shared';
import { Button, Card, Field, Input } from '@/components/ui/primitives';

/**
 * หน้าเข้าสู่ระบบ
 *
 * ส่งอีเมลกับรหัสผ่านไปที่ route handler ของ Next ไม่ใช่ backend โดยตรง เพราะฝั่งนั้น
 * เป็นคนเอา token ยัดลง cookie แบบ httpOnly ให้ — ตัว token จึงไม่เคยผ่านมือ JavaScript
 * ในหน้าเว็บเลยแม้แต่ครั้งเดียว
 */
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setError(payload.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }

      // refresh() บังคับให้ตัวกันทางอ่าน cookie ใบใหม่ ไม่งั้นหน้าที่ push ไปจะถูกเด้งกลับมาที่นี่
      router.replace(params.get('next') ?? '/');
      router.refresh();
    } catch {
      setError('ติดต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจว่า API เปิดอยู่หรือยัง');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/logo.jpg"
            alt={`โลโก้ ${BRAND_INFO.fullName}`}
            width={160}
            height={87}
            priority
            className="rounded-lg border border-navy-600"
          />
          <h1 className="text-gold-gradient mt-5 font-display text-2xl tracking-wide">
            {BRAND_INFO.productName}
          </h1>
          <p className="mt-1 text-xs tracking-[0.2em] text-gold-500 uppercase">{BRAND_INFO.name}</p>
        </div>

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <Field label="อีเมล">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                autoFocus
                placeholder="owner@thnpclinic.com"
              />
            </Field>

            <Field label="รหัสผ่าน">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm text-status-noshow">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" loading={pending} className="w-full">
              เข้าสู่ระบบ
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-gold-300/40">{BRAND_INFO.tagline}</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams ต้องอยู่ใต้ Suspense ไม่งั้นทั้งหน้าจะกลายเป็นหน้าที่เรนเดอร์ล่วงหน้าไม่ได้
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
