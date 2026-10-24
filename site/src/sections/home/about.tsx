import { Container, Eyebrow } from '@/components/ui';
import { content } from '@/content/load';
import { ZoomStage } from '@/effects/zoom-frame';

const FACTS = [
  'ห้องทรีตเมนต์แยกเป็นสัดส่วน',
  'เปลี่ยนผ้าและฆ่าเชื้อเครื่องมือทุกคิว',
  'จอง เลื่อนนัด และดูคอร์สได้เองใน LINE',
];

export function About() {
  const { site, pages } = content;
  return (
    <ZoomStage image={pages.home.aboutImage}>
      <Container>
        <div className="max-w-xl text-gold-100">
          <Eyebrow>เกี่ยวกับเรา</Eyebrow>
          <h2
            id="about-title"
            className="mt-5 text-4xl leading-[1.3] font-light text-balance sm:text-5xl lg:text-[3.4rem]"
          >
            ร้านเล็ก ๆ ที่อยากให้ทุกคนได้พักจริง
          </h2>
          <p className="mt-6 text-lg leading-[1.9] text-gold-100/80">
            {site.name} เปิดในเมือง{site.province}ตั้งแต่ปี {site.openedYear + 543}{' '}
            เราตั้งใจให้ร้านเงียบพอที่จะได้พักจริง ช่างประจำจำได้ว่าคุณชอบแรงนวดแบบไหน
            และไม่มีการเสนอขายคอร์สระหว่างที่คุณนอนหลับตาอยู่
          </p>
          <ul className="mt-8 space-y-3">
            {FACTS.map((fact) => (
              <li key={fact} className="flex items-center gap-3 text-gold-100/90">
                <span aria-hidden className="size-1.5 rotate-45 bg-gold-300" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </ZoomStage>
  );
}
