'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DeepHealthResponse } from '@clinicq/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: DeepHealthResponse }
  | { kind: 'unreachable'; message: string };

/**
 * การ์ดแสดงสถานะ API — ตัวพิสูจน์ว่า frontend ต่อถึง backend และ backend ต่อถึงฐานข้อมูล
 * ในหน้าจอเดียว ซึ่งคือเป้าหมายของ Phase 0 ทั้งหมด
 */
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`${API_URL}/health/deep`, { cache: 'no-store' });
      if (!res.ok) {
        setState({ kind: 'unreachable', message: `API ตอบกลับด้วยสถานะ ${res.status}` });
        return;
      }
      setState({ kind: 'ok', data: (await res.json()) as DeepHealthResponse });
    } catch {
      // เคสที่พบบ่อยสุดคือยังไม่ได้สตาร์ต API — บอกวิธีแก้ไปเลยดีกว่าโชว์คำว่า error เฉย ๆ
      setState({ kind: 'unreachable', message: `ติดต่อ ${API_URL} ไม่ได้` });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-navy-600 bg-navy-900/60 p-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg text-gold-200">สถานะระบบ</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gold-700 px-3 py-1 text-xs text-gold-300 transition hover:border-gold-400 hover:text-gold-100"
        >
          ตรวจอีกครั้ง
        </button>
      </header>

      {state.kind === 'loading' && (
        <div className="space-y-2" aria-busy="true">
          <div className="h-4 w-40 animate-pulse rounded bg-navy-700" />
          <div className="h-4 w-56 animate-pulse rounded bg-navy-700" />
        </div>
      )}

      {state.kind === 'unreachable' && (
        <div className="space-y-3 text-sm">
          <p className="flex items-center gap-2 text-status-noshow">
            <Dot color="var(--color-status-noshow)" />
            {state.message}
          </p>
          <p className="text-gold-300/70">
            เปิด API ด้วยคำสั่ง{' '}
            <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-200">pnpm dev</code> และ
            ตรวจว่าฐานข้อมูลขึ้นแล้วด้วย{' '}
            <code className="rounded bg-navy-800 px-1.5 py-0.5 text-gold-200">pnpm db:up</code>
          </p>
        </div>
      )}

      {state.kind === 'ok' && (
        <dl className="space-y-3 text-sm">
          <Row label="API">
            <StatusText ok={state.data.status === 'ok'}>
              {state.data.status === 'ok' ? 'ทำงานปกติ' : 'ทำงานได้บางส่วน'}
              <span className="ml-2 text-gold-300/60">v{state.data.version}</span>
            </StatusText>
          </Row>

          <Row label="ฐานข้อมูล">
            <StatusText ok={state.data.checks.database.status === 'ok'}>
              {state.data.checks.database.status === 'ok'
                ? `เชื่อมต่อแล้ว · ${state.data.checks.database.latencyMs} ms`
                : (state.data.checks.database.message ?? 'เชื่อมต่อไม่ได้')}
            </StatusText>
          </Row>

          <Row label="Redis">
            <span className="text-gold-300/60">
              {state.data.checks.redis.status === 'not_configured'
                ? 'ยังไม่ได้เชื่อมต่อ — ใช้งานจริง Phase 4'
                : state.data.checks.redis.status}
            </span>
          </Row>

          <Row label="ทำงานต่อเนื่อง">
            <span className="text-gold-300/60">{formatUptime(state.data.uptimeSec)}</span>
          </Row>
        </dl>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-navy-700/60 pb-2 last:border-0">
      <dt className="text-gold-300/70">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function StatusText({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const color = ok ? 'var(--color-status-confirmed)' : 'var(--color-status-noshow)';
  return (
    <span className="inline-flex items-center gap-2" style={{ color }}>
      <Dot color={color} />
      {children}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec} วินาที`;
  const minutes = Math.floor(sec / 60);
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ชั่วโมง ${minutes % 60} นาที`;
}
