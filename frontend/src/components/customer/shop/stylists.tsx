'use client';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import type { ShopProvider } from '@/lib/customer-types';
import { shouldDismiss, useModalBehaviour } from '../sheet';
import { PortalLinkButton } from '../ui';

/**
 * ทีมช่าง: การ์ดทรงแคปซูลที่แตะแล้วขยายตัวเองกลายเป็นแผ่นโปรไฟล์
 *
 * การ์ดกับแผ่นใช้ layoutId เดียวกัน motion จึงยืดการ์ดเดิมเป็นแผ่น (ขยับด้วย transform)
 * ลูกค้าเห็นว่าแผ่นนี้คือช่างคนที่เพิ่งแตะ ไม่ใช่หน้าต่างใหม่ที่โผล่มาจากไหนไม่รู้
 * ไม่มีประวัติหรือคำบรรยายช่าง เพราะร้านยังไม่ได้ให้ข้อมูลนี้ และเราไม่แต่งเอง
 */
export function Stylists({ providers }: { providers: ShopProvider[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = providers.find((provider) => provider.id === selectedId) ?? null;

  return (
    <LayoutGroup>
      <ul className="grid grid-cols-3 gap-3 px-5">
        {providers.map((provider) => (
          <li key={provider.id}>
            <motion.button
              type="button"
              layoutId={`stylist-${provider.id}`}
              onClick={() => setSelectedId(provider.id)}
              style={{ borderRadius: 999, opacity: selectedId === provider.id ? 0 : 1 }}
              className="flex w-full flex-col items-center gap-2 border border-ivory-200 bg-white px-2 pt-2 pb-4 focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none"
            >
              <motion.span
                layoutId={`stylist-photo-${provider.id}`}
                style={{ borderRadius: 999 }}
                className="block aspect-square w-full overflow-hidden bg-ivory-200 ring-1 ring-gold-500/50"
              >
                {provider.photoUrl && (
                  <img
                    src={provider.photoUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                )}
              </motion.span>
              <span className="text-center">
                <span className="block text-[15px] font-medium text-navy-700">{provider.name}</span>
                {provider.title && (
                  <span className="block text-xs text-navy-400">{provider.title}</span>
                )}
              </span>
            </motion.button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {selected && <StylistProfile provider={selected} onClose={() => setSelectedId(null)} />}
      </AnimatePresence>
    </LayoutGroup>
  );
}

function StylistProfile({ provider, onClose }: { provider: ShopProvider; onClose: () => void }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useModalBehaviour(true, onClose, panel);

  return (
    <div className="fixed inset-0 z-40">
      <motion.div
        className="absolute inset-0 bg-navy-950/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-[430px]">
        <motion.div
          ref={panel}
          layoutId={`stylist-${provider.id}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{ borderRadius: '28px 28px 0 0' }}
          className="pointer-events-auto bg-ivory-50 px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (shouldDismiss(info.offset.y, info.velocity.y)) onClose();
          }}
        >
          <div className="flex flex-col items-center text-center">
            <motion.span
              layoutId={`stylist-photo-${provider.id}`}
              style={{ borderRadius: 999 }}
              className="block size-32 overflow-hidden bg-ivory-200 ring-2 ring-gold-500/70"
            >
              {provider.photoUrl && (
                <img src={provider.photoUrl} alt="" className="size-full object-cover" />
              )}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-4 w-full"
            >
              <h2 id={titleId} className="font-display text-2xl text-navy-700">
                {provider.name}
              </h2>
              {provider.title && <p className="mt-1 text-sm text-navy-400">{provider.title}</p>}
              <div className="mt-6 grid gap-2">
                <PortalLinkButton href={`/c/book?provider=${provider.id}`} className="h-12">
                  จองกับช่างคนนี้
                </PortalLinkButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-full text-[15px] text-navy-700 hover:bg-ivory-200"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
