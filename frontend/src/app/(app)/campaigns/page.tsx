'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PaginatedResponse } from '@clinicq/shared';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Campaign, CampaignResults, WinbackRunResult } from '@/lib/api-types';
import { money } from '@/lib/format';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
  StatTile,
  Tag,
  Textarea,
} from '@/components/ui/primitives';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/**
 * หน้าดึงลูกค้ากลับ — หน้าที่ใช้ปิดการขาย
 *
 * ตัวเลขสามตัวบนสุดตอบคำถามเดียวที่เจ้าของร้านถามจริง ๆ ว่า "จ้างระบบนี้แล้วได้เงินคืนเมื่อไหร่"
 * ส่ง → กลับมา → รายได้ ทั้งหมดนับสดจาก CampaignRun ไม่มีตัวเลขไหนกรอกมือ
 */
export default function CampaignsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: () =>
      apiGet<PaginatedResponse<Campaign>>('campaigns', { includeInactive: true, limit: 50 }),
  });

  const list = campaigns.data?.data ?? [];
  const activeId = selectedId ?? list[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-200">ดึงลูกค้ากลับ</h1>
          <p className="mt-1 text-sm text-gold-300/60">
            งานรายวันสิบโมงหาลูกค้าที่หายไปเกินเกณฑ์ แล้วส่งข้อความให้เอง — คนหนึ่งคนได้รับ
            ข้อความของแคมเปญหนึ่งแคมเปญได้ครั้งเดียว
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          สร้างแคมเปญ
        </Button>
      </header>

      {campaigns.isPending && <Skeleton className="h-40 w-full" />}

      {campaigns.isError && (
        <Card>
          <ErrorState
            message={(campaigns.error as Error).message}
            onRetry={() => void campaigns.refetch()}
          />
        </Card>
      )}

      {campaigns.data && list.length === 0 && (
        <Card>
          <EmptyState
            title="ยังไม่มีแคมเปญ"
            hint="สร้างแคมเปญแรก แล้วระบบจะเริ่มตามลูกค้าที่หายไปให้เองทุกวัน"
          />
        </Card>
      )}

      {activeId && <CampaignResultsPanel campaignId={activeId} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((campaign) => (
          <Card key={campaign.id} className={campaign.id === activeId ? 'border-gold-700' : ''}>
            <CardHeader
              title={campaign.name}
              description={`ส่งหาคนที่หายไปเกิน ${campaign.inactiveDays} วัน`}
              action={campaign.isActive ? <Tag tone="good">เปิดอยู่</Tag> : <Tag>ปิดอยู่</Tag>}
            />

            <div className="space-y-3 p-4">
              <p className="rounded-md bg-navy-950/60 p-3 text-xs whitespace-pre-wrap text-gold-200/80">
                {campaign.message}
              </p>

              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" onClick={() => setSelectedId(campaign.id)}>
                  ดูผล
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(campaign)}>
                  แก้ไข
                </Button>
                <CampaignRunButtons campaign={campaign} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CampaignFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <CampaignFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        campaign={editing ?? undefined}
      />
    </div>
  );
}

function CampaignResultsPanel({ campaignId }: { campaignId: string }) {
  const results = useQuery({
    queryKey: ['campaigns', campaignId, 'results'],
    queryFn: () => apiGet<CampaignResults>(`campaigns/${campaignId}/results`),
  });

  if (results.isPending) return <Skeleton className="h-28 w-full" />;
  if (!results.data) return null;

  const { sent, returned, returnRate, revenue } = results.data;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg text-gold-200">
        ผลของ &ldquo;{results.data.name}&rdquo;
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="ส่งข้อความไป" value={String(sent)} unit="คน" />
        <StatTile
          label="กลับมาจอง"
          value={String(returned)}
          unit="คน"
          note={`คิดเป็น ${returnRate}% ของคนที่ได้รับ`}
          tone="good"
        />
        <StatTile
          label="รายได้ที่ตามมา"
          value={money(revenue)}
          unit="บาท"
          note="นับจากการมาครั้งแรกหลังกลับมา"
          tone="good"
        />
        <StatTile
          label="เฉลี่ยต่อคนที่กลับมา"
          value={money(returned === 0 ? 0 : Math.round(revenue / returned))}
          unit="บาท"
        />
      </div>
    </section>
  );
}

/**
 * ปุ่มส่งทดสอบและปุ่มยิงจริง
 *
 * แยกกันชัด ๆ เพราะปุ่มหนึ่งส่งหาแอดมินคนเดียว อีกปุ่มส่งหาลูกค้าจริงทั้งชุด
 * ปุ่มที่สองจึงต้องถามยืนยันก่อนเสมอ — ข้อความการตลาดที่ออกไปแล้วเรียกคืนไม่ได้
 */
function CampaignRunButtons({ campaign }: { campaign: Campaign }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const test = useMutation({
    mutationFn: () => apiPost<{ sent: boolean }>(`campaigns/${campaign.id}/test`),
    onSuccess: (result) =>
      result.sent
        ? toast.success('ส่งข้อความทดสอบเข้า LINE แอดมินแล้ว')
        : toast.error('ส่งไม่สำเร็จ — ตรวจการตั้งค่า LINE ของร้าน'),
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: () => apiPost<WinbackRunResult>(`campaigns/${campaign.id}/run`),
    onSuccess: (result) => {
      toast.success(
        `เข้าเกณฑ์ ${result.targeted} คน · ส่งสำเร็จ ${result.sent} คน · ไม่สำเร็จ ${result.failed} คน`,
      );
      setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Button size="sm" variant="ghost" loading={test.isPending} onClick={() => test.mutate()}>
        ส่งทดสอบ
      </Button>
      <Button
        size="sm"
        variant="primary"
        disabled={!campaign.isActive}
        onClick={() => setConfirmOpen(true)}
      >
        ยิงเดี๋ยวนี้
      </Button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="ยิงแคมเปญเดี๋ยวนี้"
        description="ส่งหาลูกค้าจริงทุกคนที่เข้าเกณฑ์และยังไม่เคยได้รับข้อความของแคมเปญนี้ ส่งแล้วเรียกคืนไม่ได้"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              ยังไม่ส่ง
            </Button>
            <Button variant="primary" loading={run.isPending} onClick={() => run.mutate()}>
              ส่งเลย
            </Button>
          </>
        }
      >
        <p className="text-sm text-gold-200/80">
          ระบบหน่วงการส่งไว้ 1 วินาทีต่อฉบับเพื่อกันชนกับข้อจำกัดของ LINE ถ้ามีคนเข้าเกณฑ์หลายสิบคน
          หน้าจอจะค้างรอสักครู่เป็นเรื่องปกติ
        </p>
      </Modal>
    </>
  );
}

function CampaignFormModal({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(campaign?.name ?? '');
  const [message, setMessage] = useState(campaign?.message ?? '');
  const [inactiveDays, setInactiveDays] = useState(String(campaign?.inactiveDays ?? 90));
  const [isActive, setIsActive] = useState(campaign?.isActive ?? true);

  // ค่าในฟอร์มต้องตามแคมเปญที่กดแก้ ไม่ใช่ค่าของใบที่เปิดครั้งก่อน
  const [lastId, setLastId] = useState<string | undefined>(campaign?.id);
  if (campaign?.id !== lastId) {
    setLastId(campaign?.id);
    setName(campaign?.name ?? '');
    setMessage(campaign?.message ?? '');
    setInactiveDays(String(campaign?.inactiveDays ?? 90));
    setIsActive(campaign?.isActive ?? true);
  }

  const save = useMutation({
    mutationFn: () =>
      campaign
        ? apiPatch<Campaign>(`campaigns/${campaign.id}`, {
            name,
            message,
            inactiveDays: Number(inactiveDays),
            isActive,
          })
        : apiPost<Campaign>('campaigns', {
            name,
            message,
            inactiveDays: Number(inactiveDays),
          }),
    onSuccess: () => {
      toast.success(campaign ? 'บันทึกแคมเปญแล้ว' : 'สร้างแคมเปญแล้ว');
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={campaign ? 'แก้ไขแคมเปญ' : 'สร้างแคมเปญ'}
      description="ใส่ {name} ตรงที่อยากให้แทนด้วยชื่อลูกค้า — ห้ามใส่รายละเอียดการรักษาในข้อความ"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ปิด
          </Button>
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!name || !message}
            onClick={() => save.mutate()}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="ชื่อแคมเปญ">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>

        <Field label="ข้อความ" hint="ขึ้นบรรทัดใหม่ได้ตามต้องการ">
          <Textarea
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={'💌 คิดถึงคุณ {name} จังเลยค่ะ\nมีส่วนลดพิเศษ 15% ถึงสิ้นเดือนนี้'}
          />
        </Field>

        <Field label="ส่งหาคนที่หายไปเกินกี่วัน" hint="อย่างน้อย 7 วัน">
          <Input
            type="number"
            min={7}
            value={inactiveDays}
            onChange={(event) => setInactiveDays(event.target.value)}
          />
        </Field>

        {campaign && (
          <label className="flex items-center justify-between gap-3 rounded-md border border-navy-600 px-3 py-2">
            <span className="text-sm text-gold-200">เปิดใช้งาน (งานรายวันจะยิงแคมเปญนี้)</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="size-4 accent-[var(--color-gold-400)]"
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
