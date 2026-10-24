'use client';

import { motion } from 'motion/react';
import {
  BOOKING_STEPS,
  STEP_LABEL,
  canEnter,
  type BookingDraft,
  type BookingStep,
} from '@/lib/booking';

const DRAW = { type: 'spring', stiffness: 160, damping: 26 } as const;

/**
 * เส้นทาง 4 ขั้นของการจอง — เส้นประทองวาดต่อไปถึงขั้นปัจจุบัน ลูกค้าเห็นว่าเหลืออีกกี่ขั้น
 *
 * การ "วาด" เส้นประใช้กล่องสองชั้นเลื่อนสวนทางกัน (ชั้นนอกตัดขอบ ชั้นในดึงลายกลับที่เดิม)
 * แทนการยืด scaleX ซึ่งจะยืดลายประให้เพี้ยน และแทน stroke-dashoffset ที่ใช้กับเส้นประไม่ได้
 * ทุกชั้นขยับด้วย transform อย่างเดียว
 */
export function StepPath({
  draft,
  onGo,
}: {
  draft: BookingDraft;
  onGo: (step: BookingStep) => void;
}) {
  const currentIndex = BOOKING_STEPS.indexOf(draft.step);
  const progress = currentIndex / (BOOKING_STEPS.length - 1);

  return (
    <nav aria-label="ขั้นตอนการจอง" className="relative px-2">
      <div className="pointer-events-none absolute top-4 right-[12.5%] left-[12.5%] h-0.5 overflow-hidden">
        <span className="absolute inset-0 border-t-2 border-dashed border-ivory-300" />
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={false}
          animate={{ x: `${(progress - 1) * 100}%` }}
          transition={DRAW}
        >
          <motion.span
            className="absolute inset-0 border-t-2 border-dashed border-gold-600"
            initial={false}
            animate={{ x: `${(1 - progress) * 100}%` }}
            transition={DRAW}
          />
        </motion.div>
      </div>

      <ol className="relative grid grid-cols-4">
        {BOOKING_STEPS.map((step, index) => {
          const state =
            index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
          const reachable = state !== 'current' && canEnter(step, draft);

          return (
            <li key={step} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onGo(step)}
                aria-current={state === 'current' ? 'step' : undefined}
                aria-label={`ขั้นที่ ${index + 1} ${STEP_LABEL[step]}`}
                className={`grid size-8 place-items-center rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  state === 'done'
                    ? 'bg-gold-400 text-navy-800'
                    : state === 'current'
                      ? 'bg-navy-700 text-ivory-50 ring-4 ring-gold-200'
                      : 'border border-ivory-300 bg-white text-navy-400'
                }`}
              >
                {state === 'done' ? <CheckIcon /> : index + 1}
              </button>
              <span
                className={`text-xs ${state === 'upcoming' ? 'text-navy-400' : 'font-medium text-navy-700'}`}
              >
                {STEP_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none">
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
