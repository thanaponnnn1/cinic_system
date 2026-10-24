import { Photo } from '@/components/photo';
import { Container, Eyebrow } from '@/components/ui';
import { content } from '@/content/load';
import { StepPath } from '@/effects/step-path';

const STEPS = [
  {
    title: 'ปรึกษา',
    body: 'เล่าสิ่งที่กังวลและสิ่งที่อยากได้ ช่างฟังก่อนแล้วค่อยแนะนำ ไม่มีการเสนอขายคอร์สระหว่างคุย',
    image: 'lounge-candle-table',
  },
  {
    title: 'วิเคราะห์ผิวและเส้นผม',
    body: 'ดูผิวหรือเส้นผมใต้แสงไฟส่องผิว ถามประวัติการแพ้และผลิตภัณฑ์ที่ใช้อยู่ เพื่อเลือกสูตรให้ตรงกับคุณ',
    image: 'facial-cleansing-therapist',
  },
  {
    title: 'ทำทรีตเมนต์',
    body: 'ทำทีละขั้นอย่างไม่รีบในห้องแยกที่เปลี่ยนผ้าใหม่ทุกคิว บอกช่างได้ตลอดถ้าอยากให้เบาหรือหนักขึ้น',
    image: 'facial-treatment',
  },
  {
    title: 'ดูแลต่อที่บ้าน',
    body: 'ได้คำแนะนำการดูแลต่อเป็นข้อความทาง LINE และข้อความเตือนก่อนนัดครั้งถัดไปหนึ่งวัน',
    image: 'eye-care-tray',
  },
] as const;

export function Steps() {
  const images = content.images;

  return (
    <section aria-labelledby="steps-title" className="bg-ivory-100 py-24 lg:py-32">
      <Container>
        <StepPath className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-[32px] bg-ivory-200">
              {STEPS.map((step, index) => (
                <div key={step.title} data-step-image={index} className="absolute inset-0">
                  <Photo
                    image={images[step.image]}
                    sizes="(min-width: 1024px) 560px, 1px"
                    decorative
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow tone="ink">ขั้นตอนบริการ</Eyebrow>
            <h2
              id="steps-title"
              className="mt-4 text-4xl leading-[1.3] font-light text-balance text-navy-800 sm:text-5xl"
            >
              สี่ขั้นที่เราทำทุกครั้ง
              <br />
              ไม่ว่าคุณเลือกบริการไหน
            </h2>

            <ol className="steps-list relative mt-12 lg:mt-16">
              <span
                aria-hidden
                className="absolute top-6 bottom-6 left-[19px] hidden overflow-hidden lg:block"
              >
                <span className="block h-full border-l-2 border-dashed border-gold-500/70" />
                <span className="path-cover absolute inset-0 -left-1 w-3 bg-ivory-100" />
              </span>
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <details
                    name="home-steps"
                    data-step={index}
                    open={index === 0}
                    className="group border-b border-navy-700/10 py-2 lg:border-0 lg:pl-16"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-5 py-4 [&::-webkit-details-marker]:hidden">
                      <span className="text-gold-800 relative z-10 grid size-10 shrink-0 place-items-center rounded-full border border-gold-600/50 bg-ivory-100 font-display transition-colors group-open:bg-navy-800 group-open:text-gold-200 lg:absolute lg:left-0">
                        {index + 1}
                      </span>
                      <span className="text-2xl font-normal text-navy-800 lg:text-[1.75rem]">
                        {step.title}
                      </span>
                      <span
                        aria-hidden
                        className="text-gold-800 ml-auto text-2xl transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="text-ink-600 max-w-lg pb-6 text-[17px] leading-[1.9]">
                      {step.body}
                    </p>
                  </details>
                </li>
              ))}
            </ol>
          </div>
        </StepPath>
      </Container>
    </section>
  );
}
