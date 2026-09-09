import type { EventInput } from '@fullcalendar/core';
import { ScheduleType, SubmissionType } from '@postybirb/types';
import Cron from 'croner';
import type { SubmissionRecord } from '../../../stores/records';

export function getScheduleTitle(submission: SubmissionRecord): string {
  return submission.title.trim() || submission.primaryFile?.fileName || '';
}

export function getDefaultScheduleDate(date?: Date, allDay = false): Date {
  const result = date ? new Date(date) : new Date();
  if (!date) result.setDate(result.getDate() + 1);
  if (!date || allDay) {
    result.setHours(9, 0, 0, 0);
  }
  return result;
}

export function buildScheduleEvents(
  submissions: SubmissionRecord[],
  untitled: string,
): EventInput[] {
  return submissions.flatMap((submission) => {
    const { scheduledFor } = submission.schedule;
    const title = getScheduleTitle(submission) || untitled;
    const classNames = [
      submission.type === SubmissionType.MESSAGE
        ? 'schedule-event-message'
        : 'schedule-event-file',
      ...(!submission.isScheduled ? ['schedule-event-paused'] : []),
    ];
    const extendedProps = {
      submissionId: submission.id,
      submissionType: submission.type,
      isScheduled: submission.isScheduled,
      recurring: submission.schedule.scheduleType === ScheduleType.RECURRING,
    };
    const events: EventInput[] = [];
    if (scheduledFor && !Number.isNaN(new Date(scheduledFor).getTime())) {
      events.push({
        id: submission.id,
        title,
        start: scheduledFor,
        classNames,
        editable: !submission.isPosting,
        extendedProps,
      });
    }
    if (submission.schedule.cron && submission.isScheduled) {
      try {
        const nextRuns = Cron(submission.schedule.cron).nextRuns(4);
        nextRuns.forEach((nextRun) => {
          if (
            scheduledFor &&
            nextRun.getTime() <= new Date(scheduledFor).getTime()
          )
            return;
          events.push({
            id: `${submission.id}-recurring-${nextRun.getTime()}`,
            title,
            start: nextRun,
            editable: false,
            classNames: [...classNames, 'schedule-event-preview'],
            extendedProps: { ...extendedProps, preview: true },
          });
        });
      } catch {
        return events;
      }
    }
    return events;
  });
}
