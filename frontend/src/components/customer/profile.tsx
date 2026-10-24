'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useDemoCustomers } from './demo';
import { useCustomerSession, useSignOut } from './session';
import { Sheet } from './sheet';
import { PortalButton } from './ui';

const ProfileContext = createContext<() => void>(() => {});

/**
 * แผ่นโปรไฟล์ของลูกค้า — ที่อยู่ของ "สลับลูกค้า" และ "ออกจากระบบ"
 *
 * ซ่อนไว้หลังปุ่มเล็กแทนแถบเดโมถาวร เพราะหน้าจอนี้ถูกอัดเป็นคลิปขาย แถบ "โหมดเดโม"
 * ที่ค้างอยู่ทุกช็อตทำให้คนดูรู้สึกว่าไม่ใช่ของจริง
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ProfileContext.Provider value={() => setOpen(true)}>
      {children}
      <ProfileSheet open={open} onClose={() => setOpen(false)} />
    </ProfileContext.Provider>
  );
}

function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useCustomerSession();
  const demo = useDemoCustomers();
  const signOut = useSignOut();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave(destination: string) {
    setBusy(true);
    await signOut();
    setBusy(false);
    onClose();
    router.push(destination);
  }

  const customer = session.status === 'signed_in' ? session.customer : null;

  return (
    <Sheet open={open} onClose={onClose} title="บัญชีของฉัน">
      {customer ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Initial name={customer.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-medium text-navy-700">{customer.name}</p>
              <p className="text-sm text-navy-400">
                {customer.hasLineLinked ? 'เชื่อมบัญชี LINE แล้ว' : 'ยังไม่ได้เชื่อมบัญชี LINE'}
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 rounded-2xl bg-ivory-100 px-4 py-3 text-sm text-navy-700">
            <li>
              เตือนนัดทาง LINE: <strong>{customer.consentReminder ? 'รับ' : 'ไม่รับ'}</strong>
            </li>
            <li>
              ข่าวสารและโปรโมชัน: <strong>{customer.consentMarketing ? 'รับ' : 'ไม่รับ'}</strong>
            </li>
          </ul>

          <div className="grid gap-2">
            {demo.data && (
              <PortalButton
                variant="outline"
                loading={busy}
                onClick={() => void leave('/c/welcome')}
              >
                สลับลูกค้า
              </PortalButton>
            )}
            <PortalButton variant="ghost" loading={busy} onClick={() => void leave('/c')}>
              ออกจากระบบ
            </PortalButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-navy-400">ยังไม่ได้เข้าสู่ระบบ</p>
          <PortalButton
            className="w-full"
            onClick={() => {
              onClose();
              router.push('/c/welcome');
            }}
          >
            เข้าสู่ระบบ
          </PortalButton>
        </div>
      )}
    </Sheet>
  );
}

/** ปุ่มวงกลมชื่อย่อมุมขวาบน — เปิดแผ่นโปรไฟล์ */
export function ProfileButton({ tone = 'light' }: { tone?: 'light' | 'overlay' }) {
  const openProfile = useContext(ProfileContext);
  const session = useCustomerSession();
  const name = session.status === 'signed_in' ? session.customer.name : null;

  return (
    <button
      type="button"
      onClick={openProfile}
      aria-label={name ? `บัญชีของ ${name}` : 'บัญชีของฉัน'}
      className={`grid size-11 shrink-0 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none ${
        tone === 'overlay' ? 'bg-ivory-50/85 shadow-sm backdrop-blur-sm' : ''
      }`}
    >
      {name ? <Initial name={name} size="sm" /> : <PersonIcon />}
    </button>
  );
}

function Initial({ name, size }: { name: string; size: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'size-14 text-xl' : 'size-9 text-sm';
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border border-gold-500 bg-navy-700 font-medium text-ivory-50 ${box}`}
    >
      {Array.from(name.trim())[0] ?? '?'}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6 text-navy-700" fill="none">
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
      <div className="min-w-0 pt-1">
        <h1 className="font-display text-[28px] leading-tight text-navy-700">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-400">{subtitle}</p>}
      </div>
      <ProfileButton />
    </header>
  );
}
