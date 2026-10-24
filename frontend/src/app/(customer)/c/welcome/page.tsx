'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiErrorCode, BRAND_INFO } from '@clinicq/shared';
import { CUSTOMER_KEYS, customerPost } from '@/lib/customer-api';
import { customerErrorMessage, hasErrorCode } from '@/lib/customer-errors';
import type { CustomerAuthResult, RegisterInput } from '@/lib/customer-types';
import { liffConfigured, liffIdentity, loadLiff, type LiffIdentity } from '@/lib/liff';
import { useDemoCustomers } from '@/components/customer/demo';
import { safeNextPath } from '@/components/customer/session';
import { Notice, PortalButton, PortalSkeleton } from '@/components/customer/ui';

/**
 * ตัวตนที่ใช้สมัครหรือผูกบัญชี — ทาง LINE มี ID token ให้ backend ตรวจ ทางเดโมไม่มีอะไรเลย
 * แยกเป็นชนิดเดียวแทน boolean "isDemo" เพราะทาง LINE ต้องพก idToken ไปทุกคำขอเสมอ
 */
type Identity = { via: 'liff'; idToken: string } | { via: 'demo' };

/** สถานะของทางเข้าผ่าน LINE ตอนเปิดหน้านี้ */
type LiffState =
  | { kind: 'off' }
  | { kind: 'checking' }
  /** LINE ยืนยันแล้วแต่ยังไม่รู้ว่าเป็นลูกค้าคนไหน */
  | { kind: 'needs_link'; idToken: string }
  /** ยังไม่ได้ login LINE และมีทางเดโมให้เลือก — ไม่พาไปหน้า login ของ LINE เอง */
  | { kind: 'login_available' }
  | { kind: 'failed'; message: string };

type View =
  { kind: 'start' } | { kind: 'link'; idToken: string } | { kind: 'register'; identity: Identity };

export default function WelcomePage() {
  return (
    <Suspense fallback={<WelcomeSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

/**
 * หน้าเข้าสู่ระบบของลูกค้า
 *
 * เปิดใน LINE: ส่ง ID token ให้ backend ถ้าบัญชีนี้ผูกกับลูกค้าแล้วเข้าได้ทันที ถ้ายังก็เลือก
 * "เคยใช้บริการ" (รหัส 6 หลักจากร้าน) หรือ "ลูกค้าใหม่" (สมัครพร้อมความยินยอม)
 * เปิดบนโน้ตบุ๊กตอนเดโม: เลือกลูกค้าจากรายชื่อเดโม หรือสมัครใหม่ด้วยชื่อตัวเอง
 */
function Welcome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get('next'));
  const demo = useDemoCustomers();
  const [liff, setLiff] = useState<LiffState>(
    liffConfigured ? { kind: 'checking' } : { kind: 'off' },
  );
  const [view, setView] = useState<View>({ kind: 'start' });

  function finish(result: CustomerAuthResult): boolean {
    if (result.status !== 'ok') return false;
    queryClient.setQueryData(CUSTOMER_KEYS.me, result.customer);
    // ข้อมูลของคนก่อนหน้า (ตอนสลับลูกค้าเดโม) ต้องไม่ค้างให้คนใหม่เห็น
    void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.appointments });
    void queryClient.invalidateQueries({ queryKey: CUSTOMER_KEYS.courses });
    router.replace(next);
    return true;
  }

  const demoSettled = !demo.isPending;
  const demoAvailable = demo.isSuccess;

  useEffect(() => {
    if (!liffConfigured || !demoSettled) return;
    let cancelled = false;

    (async () => {
      try {
        const identity = await liffIdentityUnlessDemo(demoAvailable);
        if (cancelled || identity.status === 'redirecting') return;
        if (identity.status === 'skipped') {
          setLiff({ kind: 'login_available' });
          return;
        }

        const result = await customerPost<CustomerAuthResult>('auth/liff', {
          idToken: identity.idToken,
        });
        if (cancelled) return;
        if (!finish(result)) setLiff({ kind: 'needs_link', idToken: identity.idToken });
      } catch (error) {
        if (!cancelled) setLiff({ kind: 'failed', message: customerErrorMessage(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
    // ไม่ใส่ finish ใน deps โดยตั้งใจ — เป็นฟังก์ชันใหม่ทุก render แล้วจะยิง auth/liff ซ้ำไม่หยุด
  }, [demoSettled, demoAvailable]);

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10">
      <BrandPlate />

      {view.kind === 'start' && (
        <StartView
          liff={liff}
          demo={demo}
          onLiffLogin={() => void liffIdentity()}
          onLink={(idToken) => setView({ kind: 'link', idToken })}
          onRegister={(identity) => setView({ kind: 'register', identity })}
          onDone={finish}
        />
      )}

      {view.kind === 'link' && (
        <LinkForm
          idToken={view.idToken}
          onBack={() => setView({ kind: 'start' })}
          onDone={finish}
        />
      )}

      {view.kind === 'register' && (
        <RegisterForm
          identity={view.identity}
          onBack={() => setView({ kind: 'start' })}
          onUseCode={(idToken) => setView({ kind: 'link', idToken })}
          onDone={finish}
        />
      )}
    </div>
  );
}

/**
 * มีทางเดโมให้เลือก และยังไม่ได้ login LINE = ไม่พาไปหน้า login ของ LINE เอง (คืน skipped)
 * ไม่งั้นเดโมบนโน้ตบุ๊กจะเด้งไปหน้า login ของ LINE ทุกครั้งที่เปิด
 */
async function liffIdentityUnlessDemo(
  demoAvailable: boolean,
): Promise<LiffIdentity | { status: 'skipped' }> {
  if (demoAvailable && !(await loadLiff()).isLoggedIn()) return { status: 'skipped' };
  return liffIdentity();
}

function BrandPlate() {
  return (
    <div className="overflow-hidden rounded-3xl bg-navy-700">
      <img
        src="/brand/logo.jpg"
        alt={BRAND_INFO.fullName}
        width={1408}
        height={768}
        className="mx-auto h-44 w-full object-cover"
      />
    </div>
  );
}

function StartView({
  liff,
  demo,
  onLiffLogin,
  onLink,
  onRegister,
  onDone,
}: {
  liff: LiffState;
  demo: ReturnType<typeof useDemoCustomers>;
  onLiffLogin: () => void;
  onLink: (idToken: string) => void;
  onRegister: (identity: Identity) => void;
  onDone: (result: CustomerAuthResult) => boolean;
}) {
  const checking = liff.kind === 'checking' || demo.isPending;
  const nothingAvailable =
    !checking && !demo.isSuccess && (liff.kind === 'off' || liff.kind === 'failed');

  return (
    <div className="pt-7">
      <h1 className="font-display text-[28px] leading-tight text-navy-700">ยินดีต้อนรับ</h1>
      <p className="mt-1 text-[15px] text-navy-400">
        เข้าสู่ระบบเพื่อจองคิว ดูนัด และดูคอร์สของคุณที่ {BRAND_INFO.name}
      </p>

      <div className="mt-6 space-y-6">
        {checking && (
          <div aria-busy="true" className="space-y-3">
            <PortalSkeleton className="h-20 w-full rounded-2xl" />
            <PortalSkeleton className="h-20 w-full rounded-2xl" />
          </div>
        )}

        {liff.kind === 'failed' && <Notice tone="error">{liff.message}</Notice>}

        {liff.kind === 'needs_link' && (
          <div className="space-y-3">
            <OptionCard
              title="เคยใช้บริการแล้ว"
              hint="มีรหัสเชื่อม 6 หลักจากร้าน"
              onClick={() => onLink(liff.idToken)}
            />
            <OptionCard
              title="ลูกค้าใหม่"
              hint="สมัครด้วยชื่อและเบอร์โทร ใช้เวลาไม่ถึงนาที"
              onClick={() => onRegister({ via: 'liff', idToken: liff.idToken })}
            />
          </div>
        )}

        {liff.kind === 'login_available' && (
          <PortalButton
            className="h-12 w-full bg-[#06C755] hover:bg-[#05b34c]"
            onClick={onLiffLogin}
          >
            เข้าสู่ระบบด้วย LINE
          </PortalButton>
        )}

        {demo.isSuccess && (
          <DemoChooser
            customers={demo.data}
            onRegister={() => onRegister({ via: 'demo' })}
            onDone={onDone}
          />
        )}

        {nothingAvailable && <Notice tone="info">กรุณาเปิดหน้านี้จากเมนูของร้านในแอป LINE</Notice>}
      </div>
    </div>
  );
}

function OptionCard({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-ivory-200 bg-white px-5 py-4 text-left shadow-[0_8px_24px_-18px_rgb(20_33_50/0.35)] focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none"
    >
      <span>
        <span className="block text-[17px] font-medium text-navy-700">{title}</span>
        <span className="mt-0.5 block text-sm text-navy-400">{hint}</span>
      </span>
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0 text-gold-700" fill="none">
        <path d="m9.5 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/**
 * ตัวเลือกลูกค้าเดโม — แสดงแค่ชื่อ ไม่มีเบอร์หรือข้อมูลอื่น เพราะหน้านี้ถูกฉายบนจอประชุม
 */
function DemoChooser({
  customers,
  onRegister,
  onDone,
}: {
  customers: { id: string; name: string }[];
  onRegister: () => void;
  onDone: (result: CustomerAuthResult) => boolean;
}) {
  const [search, setSearch] = useState('');
  const login = useMutation({
    mutationFn: (customerId: string) =>
      customerPost<CustomerAuthResult>('auth/demo', { customerId }),
    onSuccess: (result) => void onDone(result),
  });

  const filtered = useMemo(() => {
    const term = search.trim();
    return term ? customers.filter((c) => c.name.includes(term)) : customers;
  }, [customers, search]);

  return (
    <section className="rounded-3xl border border-ivory-200 bg-white p-4">
      <h2 className="font-display text-xl text-navy-700">ดูในมุมลูกค้า</h2>
      <p className="mt-0.5 text-sm text-navy-400">
        เลือกลูกค้าจากระบบ หรือสมัครใหม่ด้วยชื่อของคุณเอง
      </p>

      <PortalButton variant="outline" className="mt-4 h-12 w-full" onClick={onRegister}>
        ลูกค้าใหม่ สมัครด้วยชื่อตัวเอง
      </PortalButton>

      <label className="mt-4 block">
        <span className="sr-only">ค้นหาชื่อลูกค้า</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาชื่อลูกค้า"
          className={INPUT}
        />
      </label>

      {login.isError && (
        <div className="mt-3">
          <Notice tone="error">{customerErrorMessage(login.error)}</Notice>
        </div>
      )}

      <ul className="mt-3 max-h-[46dvh] divide-y divide-ivory-200 overflow-y-auto">
        {filtered.map((customer) => (
          <li key={customer.id}>
            <button
              type="button"
              disabled={login.isPending}
              onClick={() => login.mutate(customer.id)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-1 text-left text-[15px] text-navy-700 hover:bg-ivory-50 focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none disabled:opacity-60"
            >
              {customer.name}
              {login.isPending && login.variables === customer.id && (
                <span className="text-sm text-navy-400">กำลังเข้า…</span>
              )}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-navy-400">ไม่พบชื่อที่ค้นหา</li>
        )}
      </ul>
    </section>
  );
}

const INPUT =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-3 text-[16px] text-navy-700 placeholder:text-navy-400 focus:border-gold-600 focus:ring-1 focus:ring-gold-600 focus:outline-none';

function FormFrame({
  title,
  hint,
  onBack,
  children,
}: {
  title: string;
  hint: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pt-6">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-navy-700 hover:bg-ivory-200"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none">
          <path d="m14.5 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        ย้อนกลับ
      </button>
      <h1 className="mt-2 font-display text-[26px] leading-tight text-navy-700">{title}</h1>
      <p className="mt-1 text-[15px] text-navy-400">{hint}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function LinkForm({
  idToken,
  onBack,
  onDone,
}: {
  idToken: string;
  onBack: () => void;
  onDone: (result: CustomerAuthResult) => boolean;
}) {
  const [code, setCode] = useState('');
  const link = useMutation({
    mutationFn: () => customerPost<CustomerAuthResult>('auth/link', { idToken, code }),
    onSuccess: (result) => void onDone(result),
  });
  const valid = /^\d{6}$/.test(code);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) link.mutate();
  }

  return (
    <FormFrame
      title="ใส่รหัสจากร้าน"
      hint="ขอรหัสเชื่อม 6 หลักจากพนักงานที่ร้าน รหัสใช้ได้ครั้งเดียว"
      onBack={onBack}
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="รหัสเชื่อม 6 หลัก"
          placeholder="••••••"
          className={`${INPUT} text-center font-display text-3xl tracking-[0.5em]`}
        />
        {link.isError && <Notice tone="error">{customerErrorMessage(link.error)}</Notice>}
        {!valid && code.length > 0 && (
          <p className="text-sm text-navy-400">ใส่ให้ครบ 6 หลัก (ตอนนี้ {code.length} หลัก)</p>
        )}
        <PortalButton
          type="submit"
          className="h-12 w-full"
          loading={link.isPending}
          disabled={!valid}
        >
          เชื่อมบัญชี
        </PortalButton>
      </form>
    </FormFrame>
  );
}

/** กฎเดียวกับ DemoRegisterDto ของ backend — บอกลูกค้าทันทีโดยไม่ต้องรอส่งไปถึง server */
const PHONE_PATTERN = /^0\d{8,9}$/;

function RegisterForm({
  identity,
  onBack,
  onUseCode,
  onDone,
}: {
  identity: Identity;
  onBack: () => void;
  onUseCode: (idToken: string) => void;
  onDone: (result: CustomerAuthResult) => boolean;
}) {
  const [form, setForm] = useState<RegisterInput>({
    name: '',
    phone: '',
    // ปล่อยว่างทั้งสองช่องโดยตั้งใจ — ความยินยอมตาม PDPA ต้องเกิดจากลูกค้าติ๊กเอง
    consentReminder: false,
    consentMarketing: false,
  });
  const [touched, setTouched] = useState(false);

  const register = useMutation({
    mutationFn: (input: RegisterInput) =>
      identity.via === 'liff'
        ? customerPost<CustomerAuthResult>('auth/register', { ...input, idToken: identity.idToken })
        : customerPost<CustomerAuthResult>('auth/demo-register', input),
    onSuccess: (result) => void onDone(result),
  });

  const phone = form.phone.replace(/[\s-]/g, '');
  const nameError = touched && form.name.trim() === '' ? 'กรุณาใส่ชื่อ' : null;
  const phoneError =
    touched && !PHONE_PATTERN.test(phone) ? 'เบอร์มือถือต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก' : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (form.name.trim() === '' || !PHONE_PATTERN.test(phone)) return;
    register.mutate({ ...form, name: form.name.trim(), phone });
  }

  const phoneTaken = hasErrorCode(register.error, ApiErrorCode.PHONE_ALREADY_REGISTERED);

  return (
    <FormFrame
      title="สมัครลูกค้าใหม่"
      hint="ใช้ชื่อและเบอร์นี้ติดต่อเรื่องนัดของคุณ"
      onBack={onBack}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-navy-700">ชื่อ-นามสกุล</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            autoComplete="name"
            className={INPUT}
            aria-invalid={nameError !== null}
          />
          {nameError && <span className="block text-sm text-red-700">{nameError}</span>}
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-navy-700">เบอร์มือถือ</span>
          <input
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            inputMode="tel"
            autoComplete="tel"
            placeholder="08x xxx xxxx"
            className={INPUT}
            aria-invalid={phoneError !== null}
          />
          {phoneError && <span className="block text-sm text-red-700">{phoneError}</span>}
        </label>

        <fieldset className="space-y-2 rounded-2xl bg-ivory-100 p-4">
          <legend className="sr-only">ความยินยอม</legend>
          <ConsentBox
            checked={form.consentReminder}
            onChange={(consentReminder) => setForm({ ...form, consentReminder })}
            title="รับข้อความเตือนนัดทาง LINE"
            hint="แจ้งเตือนก่อนถึงนัด 1 วัน พร้อมปุ่มยืนยันหรือขอเลื่อน"
          />
          <ConsentBox
            checked={form.consentMarketing}
            onChange={(consentMarketing) => setForm({ ...form, consentMarketing })}
            title="รับข่าวสารและโปรโมชันทาง LINE"
            hint="ไม่ติ๊กก็จองคิวได้ตามปกติ"
          />
          <p className="pt-1 text-xs text-navy-400">
            เลือกแต่ละข้อแยกกันได้ และเปลี่ยนใจภายหลังได้โดยแจ้งทางร้าน
          </p>
        </fieldset>

        {register.isError && (
          <Notice tone="error">
            {phoneTaken && identity.via === 'demo'
              ? 'เบอร์นี้มีในร้านแล้ว ย้อนกลับไปเลือกชื่อของคุณจากรายชื่อลูกค้าได้เลย'
              : customerErrorMessage(register.error)}
            {phoneTaken && identity.via === 'liff' && (
              <button
                type="button"
                onClick={() => onUseCode(identity.idToken)}
                className="mt-2 block font-medium underline"
              >
                ใส่รหัสจากร้าน
              </button>
            )}
          </Notice>
        )}

        <PortalButton type="submit" className="h-12 w-full" loading={register.isPending}>
          สมัครและเข้าสู่ระบบ
        </PortalButton>
      </form>
    </FormFrame>
  );
}

function ConsentBox({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-navy-700"
      />
      <span>
        <span className="block text-[15px] text-navy-700">{title}</span>
        <span className="block text-sm text-navy-400">{hint}</span>
      </span>
    </label>
  );
}

function WelcomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4 px-5 pt-6">
      <PortalSkeleton className="h-44 w-full rounded-3xl" />
      <PortalSkeleton className="h-8 w-40" />
      <PortalSkeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
