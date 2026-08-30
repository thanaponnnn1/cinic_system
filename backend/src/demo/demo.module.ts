import { Module } from '@nestjs/common';
import { ClockModule } from '../clock/clock.module';
import { QueueModule } from '../queue/queue.module';
import { DigestModule } from '../digest/digest.module';
import { DemoController } from './demo.controller';
import { TimeMachineService } from './time-machine.service';

/**
 * เครื่องมือเดโม — route ถูก map ไว้เสมอ แต่การทำงานจริงถูกกันด้วย DEMO_MODE ใน ClockService
 * ที่ทำแบบนี้เพราะ route ที่หายไปตามค่า config ทำให้ Swagger กับหน้าจอไม่ตรงกันจนงง
 */
@Module({
  imports: [QueueModule, ClockModule, DigestModule],
  controllers: [DemoController],
  providers: [TimeMachineService],
})
export class DemoModule {}
