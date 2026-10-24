import { ApptStatus, BUSINESS_HOURS } from '@clinicq/shared';
import { bangkokDayRange, formatBangkokDate } from '../common/bangkok-time';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** ชนิดของวันในชุดเดโม — แต่ละชนิดมีสัดส่วนสถานะของคิวที่ยังไม่ถึงเวลาต่างกัน */
type DayKind = 'history' | 'today' | 'tomorrow' | 'upcoming';

export interface DemoScheduleConfig {
  seed: number;
  hours: { open: string; close: string; slotMinutes: number };
  historyDays: number;
  /** จำนวนนัดต่อวันย้อนหลัง สุ่มในช่วงนี้ (รวมปลายทั้งสองข้าง) */
  perHistoryDay: readonly [number, number];
  /** อัตราไม่มาตามนัดของวันเก่าสุดและวันล่าสุด ไล่ระดับเป็นเส้นตรงระหว่างกัน */
  noShowRate: { oldest: number; newest: number };
  cancelledInHistory: number;
  todayCount: number;
  tomorrowCount: number;
  upcomingDays: number;
  perUpcomingDay: number;
  /** คิวที่ยังไม่ถึง (จอง/ยืนยัน) ต่อลูกค้าหนึ่งคน ต้องน้อยกว่า MAX_UPCOMING_BOOKINGS ของหน้าลูกค้า */
  maxUpcomingPerCustomer: number;
}

/**
 * ค่าตั้งต้นของชุดเดโม
 *
 * อัตราไม่มาตามนัดลดจาก 15% เหลือ 5% เพราะกราฟ 7 วันต้องเล่าเรื่อง "หลังใช้ระบบเตือนนัด
 * คนลืมนัดน้อยลง" ได้ด้วยตัวเอง โดยไม่ต้องมีใครยืนอธิบาย
 */
export const DEMO_SCHEDULE_CONFIG: DemoScheduleConfig = {
  seed: 20261024,
  hours: {
    open: BUSINESS_HOURS.open,
    close: BUSINESS_HOURS.close,
    slotMinutes: BUSINESS_HOURS.slotMinutes,
  },
  historyDays: 14,
  perHistoryDay: [9, 11],
  noShowRate: { oldest: 0.15, newest: 0.05 },
  cancelledInHistory: 3,
  todayCount: 10,
  tomorrowCount: 8,
  upcomingDays: 4,
  perUpcomingDay: 3,
  // เหลือที่ให้จองเองได้อีกอย่างน้อยหนึ่งนัด ไม่งั้นเดโม "ดูในมุมลูกค้า" กดจองแล้วเจอเพดานทันที
  maxUpcomingPerCustomer: 2,
};

export interface DemoScheduleInput {
  now: Date;
  providers: readonly { id: string }[];
  services: readonly { id: string; durationMin: number }[];
  customerIds: readonly string[];
  config?: DemoScheduleConfig;
}

export interface DemoAppointmentPlan {
  customerId: string;
  providerId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  status: ApptStatus;
}

interface DaySpec {
  offset: number;
  kind: DayKind;
  count: number;
  /** ลำดับของวันย้อนหลัง 0 = เก่าสุด ใช้ไล่ระดับอัตราไม่มาตามนัด */
  historyIndex: number;
}

type Slot = Omit<DemoAppointmentPlan, 'status' | 'customerId'>;
type Unassigned = Omit<DemoAppointmentPlan, 'customerId'>;

/**
 * ตารางนัดของชุดเดโม — ฟังก์ชันบริสุทธิ์ ข้อมูลเข้าเหมือนเดิมได้ผลเหมือนเดิมทุกครั้ง
 *
 * วางตารางของแต่ละวันโดยไม่ดูเวลาปัจจุบัน แล้วค่อยใส่สถานะตามเวลา ผลคือรีเซ็ตกี่ครั้ง
 * ในวันเดียวกันก็ได้หน้าตาบอร์ดเดิม ต่างกันแค่คิวไหนผ่านไปแล้ว
 * นัดที่คร่อมเวลาปัจจุบันพอดีถูกตัดทิ้ง เพราะจะเป็น "เสร็จแล้ว" หรือ "ยังไม่มา" ก็ผิดทั้งคู่
 */
export function buildDemoSchedule(input: DemoScheduleInput): DemoAppointmentPlan[] {
  const config = input.config ?? DEMO_SCHEDULE_CONFIG;

  if (input.providers.length === 0 || input.services.length === 0) {
    throw new Error('ต้องมีช่างและบริการที่เปิดอยู่อย่างน้อยอย่างละหนึ่งก่อนสร้างข้อมูลเดโม');
  }
  if (input.customerIds.length === 0) {
    throw new Error('ไม่มีลูกค้าที่มาใช้บริการภายใน 90 วัน จึงไม่มีใครให้ใส่ในตารางเดโม');
  }

  const now = input.now.getTime();
  const cancelledOffsets = pickCancelledDays(config);

  const laidOut = daySpecs(config).map((day) => {
    const rng = mulberry32(daySeed(config.seed, day.offset));
    const count = day.kind === 'history' ? randInt(rng, ...config.perHistoryDay) : day.count;
    const slots = layoutDay(dayOpen(input.now, day.offset, config), count, input, config, rng);

    return {
      day,
      rng,
      past: slots.filter((s) => s.endsAt.getTime() <= now),
      future: slots.filter((s) => s.startsAt.getTime() >= now),
    };
  });

  const noShow = noShowCounter(config);
  const counts = laidOut.map(({ day, past }) => noShow(day, past.length));
  // วันละสิบนัดได้นัดไม่มาวันละ 0–2 ใบ ซึ่งแกว่งจนกราฟ 7 วันอ่านไม่ออก
  // เรียงวันย้อนหลังจากมากไปน้อยให้เส้นลงต่อเนื่อง ผลรวมยังเท่าเดิม
  const noShows = [
    ...counts.slice(0, config.historyDays).sort((a, b) => b - a),
    ...counts.slice(config.historyDays),
  ];

  const plan = laidOut
    .flatMap(({ day, rng, past, future }, i) => [
      ...pastStatuses(past, noShows[i], cancelledOffsets.has(day.offset), rng),
      ...futureStatuses(future, day.kind, rng),
    ])
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return assignCustomers(plan, input.customerIds, now, config);
}

/** เวลาเริ่มของนัดที่เสร็จแล้วใบล่าสุดของลูกค้าแต่ละคน — ลูกค้าที่ไม่มีนัดเสร็จแล้วไม่อยู่ในผลลัพธ์ */
export function latestCompletedStartByCustomer(
  plan: readonly Pick<DemoAppointmentPlan, 'customerId' | 'startsAt' | 'status'>[],
): Map<string, Date> {
  const latest = new Map<string, Date>();

  for (const a of plan) {
    if (a.status !== ApptStatus.COMPLETED) continue;
    const seen = latest.get(a.customerId);
    if (!seen || a.startsAt > seen) latest.set(a.customerId, a.startsAt);
  }

  return latest;
}

/**
 * ใส่ลูกค้าให้ทุกนัดหลังรู้สถานะแล้ว เพราะเพดานคิวต่อคนนับเฉพาะคิวที่ยังไม่ถึง
 *
 * เรียงคนที่ถูกใช้น้อยก่อน ชื่อบนบอร์ดจึงกระจาย ลูกค้าคนเดียวกันไม่ถูกนัดสองที่ในเวลาเดียวกัน
 * นัดที่หาลูกค้าไม่ได้ถูกตัดทิ้ง ซึ่งเกิดกับวันท้าย ๆ เมื่อทุกคนเต็มเพดานแล้ว
 */
function assignCustomers(
  plan: Unassigned[],
  customerIds: readonly string[],
  now: number,
  config: DemoScheduleConfig,
): DemoAppointmentPlan[] {
  const order = shuffle([...customerIds], mulberry32(daySeed(config.seed, 20_000)));
  const busy = new Map<string, [number, number][]>();
  const used = new Map<string, number>();
  const upcoming = new Map<string, number>();
  const assigned: DemoAppointmentPlan[] = [];

  for (const appointment of plan) {
    const start = appointment.startsAt.getTime();
    const end = appointment.endsAt.getTime();
    const holdsSlot =
      start >= now &&
      (appointment.status === ApptStatus.BOOKED || appointment.status === ApptStatus.CONFIRMED);

    const customerId = [...order]
      .sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))
      .find(
        (id) =>
          (!holdsSlot || (upcoming.get(id) ?? 0) < config.maxUpcomingPerCustomer) &&
          (busy.get(id) ?? []).every(([s, e]) => end <= s || start >= e),
      );
    if (!customerId) continue;

    busy.set(customerId, [...(busy.get(customerId) ?? []), [start, end]]);
    used.set(customerId, (used.get(customerId) ?? 0) + 1);
    if (holdsSlot) upcoming.set(customerId, (upcoming.get(customerId) ?? 0) + 1);
    assigned.push({ ...appointment, customerId });
  }

  return assigned;
}

function daySpecs(config: DemoScheduleConfig): DaySpec[] {
  const days: DaySpec[] = [];

  for (let i = 0; i < config.historyDays; i += 1) {
    days.push({ offset: i - config.historyDays, kind: 'history', count: 0, historyIndex: i });
  }
  days.push({ offset: 0, kind: 'today', count: config.todayCount, historyIndex: -1 });
  days.push({ offset: 1, kind: 'tomorrow', count: config.tomorrowCount, historyIndex: -1 });
  for (let i = 0; i < config.upcomingDays; i += 1) {
    days.push({ offset: 2 + i, kind: 'upcoming', count: config.perUpcomingDay, historyIndex: -1 });
  }

  return days;
}

function pickCancelledDays(config: DemoScheduleConfig): Set<number> {
  const rng = mulberry32(daySeed(config.seed, 10_000));
  const offsets = shuffle(
    Array.from({ length: config.historyDays }, (_, i) => i - config.historyDays),
    rng,
  );

  return new Set(offsets.slice(0, config.cancelledInHistory));
}

/**
 * จำนวนนัดไม่มาของแต่ละวัน แบบยกเศษไปวันถัดไป
 *
 * ปัดทีละวันตรง ๆ กับวันละสิบนัดจะได้ 2,1,1,1,... จนผลรวมเพี้ยนจากอัตราที่ตั้งไว้
 * การทดเศษไว้ทำให้ผลรวมของทุกช่วงตรงกับอัตราที่ตั้ง
 */
function noShowCounter(config: DemoScheduleConfig): (day: DaySpec, pastCount: number) => number {
  let carry = 0.5;
  const { oldest, newest } = config.noShowRate;
  const span = Math.max(1, config.historyDays - 1);

  return (day, pastCount) => {
    const rate =
      day.kind === 'history' ? oldest + ((newest - oldest) * day.historyIndex) / span : newest;
    const total = carry + rate * pastCount;
    const count = Math.floor(total);

    carry = total - count;
    return count;
  };
}

function dayOpen(now: Date, offset: number, config: DemoScheduleConfig): number {
  const date = formatBangkokDate(new Date(now.getTime() + offset * DAY_MS));
  return bangkokDayRange(date).start.getTime() + minutesOf(config.hours.open) * MINUTE_MS;
}

/**
 * วางนัดของหนึ่งวันลงตารางช่องละ slotMinutes ต่อช่าง
 *
 * จองช่องเต็มช่องเสมอแม้บริการจะสั้นกว่านั้น นัดของช่างคนเดียวกันจึงซ้อนกันไม่ได้โดยโครงสร้าง
 */
function layoutDay(
  openAt: number,
  count: number,
  input: DemoScheduleInput,
  config: DemoScheduleConfig,
  rng: () => number,
): Slot[] {
  const { slotMinutes } = config.hours;
  const slotMs = slotMinutes * MINUTE_MS;
  const totalUnits = (minutesOf(config.hours.close) - minutesOf(config.hours.open)) / slotMinutes;
  const occupied = new Map(
    input.providers.map((p) => [p.id, new Array<boolean>(totalUnits).fill(false)]),
  );
  const slots: Slot[] = [];

  for (let i = 0; i < count; i += 1) {
    const service = input.services[randInt(rng, 0, input.services.length - 1)];
    const units = Math.ceil(service.durationMin / slotMinutes);
    const candidates: { providerId: string; unit: number }[] = [];

    for (const [providerId, grid] of occupied) {
      for (let unit = 0; unit + units <= totalUnits; unit += 1) {
        if (grid.slice(unit, unit + units).every((taken) => !taken)) {
          candidates.push({ providerId, unit });
        }
      }
    }
    if (candidates.length === 0) continue;

    const pick = candidates[randInt(rng, 0, candidates.length - 1)];
    const start = openAt + pick.unit * slotMs;

    occupied.get(pick.providerId)!.fill(true, pick.unit, pick.unit + units);
    slots.push({
      providerId: pick.providerId,
      serviceId: service.id,
      startsAt: new Date(start),
      endsAt: new Date(start + service.durationMin * MINUTE_MS),
    });
  }

  return slots;
}

function pastStatuses(
  slots: Slot[],
  noShows: number,
  hasCancelled: boolean,
  rng: () => number,
): Unassigned[] {
  const order = shuffle(
    slots.map((_, i) => i),
    rng,
  );
  const statusOf = new Map<number, ApptStatus>();

  order.forEach((index, rank) => {
    if (rank < noShows) statusOf.set(index, ApptStatus.NO_SHOW);
    else if (hasCancelled && rank === noShows) statusOf.set(index, ApptStatus.CANCELLED);
    else statusOf.set(index, ApptStatus.COMPLETED);
  });

  return slots.map((slot, i) => ({ ...slot, status: statusOf.get(i)! }));
}

/** สัดส่วนสถานะของคิวที่ยังไม่ถึง — วันนี้ลูกค้ากดยืนยันจากข้อความเตือนเมื่อวานไปแล้วเกือบหมด */
const CONFIRMED_SHARE: Record<Exclude<DayKind, 'history'>, number> = {
  today: 0.7,
  tomorrow: 0.3,
  upcoming: 0.15,
};

function futureStatuses(slots: Slot[], kind: DayKind, rng: () => number): Unassigned[] {
  if (kind === 'history') return [];

  return slots.map((slot, i) => {
    // คิวขอเลื่อนหนึ่งใบของพรุ่งนี้ ให้พนักงานเห็นงานที่ต้องโทรตามบนบอร์ดเสมอ
    if (kind === 'tomorrow' && i === 0) return { ...slot, status: ApptStatus.RESCHEDULE_REQUESTED };

    const status = rng() < CONFIRMED_SHARE[kind] ? ApptStatus.CONFIRMED : ApptStatus.BOOKED;
    return { ...slot, status };
  });
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function daySeed(seed: number, offset: number): number {
  return (seed ^ Math.imul(offset + 0x51ed, 0x9e3779b1)) >>> 0;
}

/** PRNG ที่ตั้ง seed ได้ — Math.random ตั้ง seed ไม่ได้ ชุดเดโมจะเปลี่ยนทุกครั้งที่รีเซ็ต */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
