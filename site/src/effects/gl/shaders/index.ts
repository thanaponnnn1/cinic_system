import { AMBER_CELLS } from './amber-cells';
import { AURORA_GOLD } from './aurora-gold';
import { MESH_DRIFT } from './mesh-drift';

/**
 * ทะเบียน preset: shader, เวลาเริ่ม (และเวลาตายตัวของเฟรมนิ่งตอนลดการเคลื่อนไหว) และความแรงของเกรน
 * still เลือกจากการดูภาพจริงว่าเฟรมนั้นสวย เปลี่ยน shader แล้วต้องดูใหม่
 */
export const PRESETS = {
  'aurora-gold': { fragment: AURORA_GOLD, still: 41, dither: 4 },
  'mesh-drift': { fragment: MESH_DRIFT, still: 23, dither: 9 },
  'amber-cells': { fragment: AMBER_CELLS, still: 17, dither: 5 },
} as const satisfies Record<string, { fragment: string; still: number; dither: number }>;

export type GlPreset = keyof typeof PRESETS;
