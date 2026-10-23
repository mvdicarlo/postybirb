import { Injectable } from '@nestjs/common';
import {
  Cron,
  CronExpression,
  ScheduleModule,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';

@Injectable()
class PostingScheduler {
  scheduledTicks = jest.fn();

  pendingTicks = jest.fn();

  @Cron(CronExpression.EVERY_30_SECONDS, { name: 'scheduled' })
  handleScheduledSubmissions() {
    this.scheduledTicks();
  }

  @Cron(CronExpression.EVERY_SECOND, { name: 'pending' })
  handlePendingWork() {
    this.pendingTicks();
  }
}

describe.each([
  ['scheduled', 30_000, 'scheduledTicks'],
  ['pending', 1_000, 'pendingTicks'],
] as const)('Posting scheduler: %s', (name, period, ticksProperty) => {
  let module: TestingModule;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [PostingScheduler],
    }).compile();
    await module.init();
    module
      .get(SchedulerRegistry)
      .getCronJobs()
      .forEach((job) => job.stop());
  });

  afterEach(async () => {
    await module?.close();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([-1, -1_000])(
    'keeps firing after a negative start timeout of %i ms',
    async (timeout) => {
      const job = module.get(SchedulerRegistry).getCronJob(name);
      const ticks = module.get(PostingScheduler)[ticksProperty];
      const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(job.cronTime, 'getTimeout').mockReturnValueOnce(timeout);

      job.start();

      const immediateTicks = timeout === -1 ? 1 : 0;
      expect(ticks).toHaveBeenCalledTimes(immediateTicks);
      expect(job.isActive).toBe(true);
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('Missed execution deadline'),
      );

      await jest.advanceTimersByTimeAsync(period);
      expect(ticks).toHaveBeenCalledTimes(immediateTicks + 1);
      await jest.advanceTimersByTimeAsync(period);
      expect(ticks).toHaveBeenCalledTimes(immediateTicks + 2);
      expect(job.isActive).toBe(true);
    },
  );
});
