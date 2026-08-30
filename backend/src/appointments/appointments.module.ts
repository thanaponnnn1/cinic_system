import { Module } from '@nestjs/common';
import { RemindersModule } from '../reminders/reminders.module';
import { WaitlistQueueModule } from '../waitlist/waitlist-queue.module';
import { CampaignAttributionModule } from '../campaigns/campaign-attribution.module';
import { ClockModule } from '../clock/clock.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [RemindersModule, WaitlistQueueModule, CampaignAttributionModule, ClockModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
