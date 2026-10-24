/**
 * คุณภาพของพื้นหลัง WebGL ต่อเครื่อง ฟังก์ชันล้วน ไม่แตะ DOM จึงทดสอบได้ด้วย node:test
 *
 * off  = ไม่โหลดโค้ด GL เลย เห็นพื้นหลัง CSS ที่ออกแบบไว้
 * low  = บัฟเฟอร์ 0.35 เท่าของพิกเซล CSS และไม่เกิน 30 fps (มือถือ เครื่องแรม/แกนน้อย)
 * full = บัฟเฟอร์ 0.5 เท่า และไม่เกิน 60 fps
 *
 * ?fx=off|low|full ในลิงก์บังคับระดับได้ (ใช้ตอนอัดคลิป) แต่บังคับให้วาดบนเครื่องที่ไม่มี WebGL ไม่ได้
 */
export type FxTier = 'off' | 'low' | 'full';

export type FxSignals = {
  /** ค่าของ ?fx= ในลิงก์ (location.search ทั้งก้อนก็ได้) */
  search: string;
  reducedMotion: boolean;
  /** เบราว์เซอร์มี WebGLRenderingContext (สร้าง context ได้จริงหรือไม่ รู้ตอนวาด) */
  webgl: boolean;
  /** navigator.deviceMemory มีแค่ใน Chromium หน่วย GB */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coarsePointer: boolean;
  viewportWidth: number;
};

export const TIER_SETTINGS = {
  low: { scale: 0.35, fps: 30 },
  full: { scale: 0.5, fps: 60 },
} as const satisfies Record<Exclude<FxTier, 'off'>, { scale: number; fps: number }>;

const SMALL_VIEWPORT = 768;

export function parseFxQuery(search: string): FxTier | null {
  const value = new URLSearchParams(search).get('fx');
  return value === 'off' || value === 'low' || value === 'full' ? value : null;
}

export function fxTier(s: FxSignals): FxTier {
  if (!s.webgl) return 'off';
  const forced = parseFxQuery(s.search);
  if (forced) return forced;
  if (s.reducedMotion) return 'off';
  const memory = s.deviceMemory ?? 8;
  const cores = s.hardwareConcurrency ?? 4;
  if (memory <= 2 || cores <= 2) return 'off';
  if (memory < 4 || cores < 4 || s.coarsePointer || s.viewportWidth < SMALL_VIEWPORT) return 'low';
  return 'full';
}

/** ขนาดบัฟเฟอร์ของ canvas: สัดส่วนของพิกเซล CSS โดยไม่คูณ DPR เกิน 1 แล้วให้ CSS ขยายขึ้นเต็มกรอบ */
export function bufferSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  scale: number,
): { width: number; height: number } {
  const k = Math.min(devicePixelRatio, 1) * scale;
  return {
    width: Math.max(1, Math.round(cssWidth * k)),
    height: Math.max(1, Math.round(cssHeight * k)),
  };
}

/** เลือกช่องที่ได้ WebGL context: ช่องที่อยู่ใกล้จอ เรียงจากใกล้กลางจอที่สุด ไม่เกิน max ช่อง */
export function pickLive<T>(
  candidates: readonly { key: T; near: boolean; distance: number }[],
  max: number,
): Set<T> {
  return new Set(
    candidates
      .filter((c) => c.near)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, max)
      .map((c) => c.key),
  );
}
