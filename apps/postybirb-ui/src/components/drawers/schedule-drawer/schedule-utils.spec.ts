import { ISubmissionDto, ScheduleType, SubmissionType } from '@postybirb/types';
import { SubmissionRecord } from '../../../stores/records/submission-record';
import {
    buildScheduleEvents,
    getDefaultScheduleDate,
    getScheduleTitle,
} from './schedule-utils';

function submission(overrides: Partial<ISubmissionDto> = {}) {
  return new SubmissionRecord({
    id: 'submission-1',
    type: SubmissionType.FILE,
    isScheduled: true,
    files: [],
    options: [],
    schedule: {
      scheduleType: ScheduleType.SINGLE,
      scheduledFor: new Date(2026, 8, 11, 9).toISOString(),
    },
    ...overrides,
  } as ISubmissionDto);
}

describe('schedule calendar helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 9, 12));
  });

  afterEach(() => jest.useRealTimers());

  it('defaults an undated schedule to tomorrow at 9am', () => {
    expect(getDefaultScheduleDate()).toEqual(new Date(2026, 8, 10, 9));
  });

  it('uses 9am for a month-grid drop without mutating the input', () => {
    const date = new Date(2026, 8, 14);
    expect(getDefaultScheduleDate(date, true)).toEqual(
      new Date(2026, 8, 14, 9),
    );
    expect(date.getHours()).toBe(0);
  });

  it('preserves the time of a week-grid drop', () => {
    expect(getDefaultScheduleDate(new Date(2026, 8, 14, 14, 45))).toEqual(
      new Date(2026, 8, 14, 14, 45),
    );
  });

  it('preserves an explicitly selected midnight time', () => {
    expect(getDefaultScheduleDate(new Date(2026, 8, 14))).toEqual(
      new Date(2026, 8, 14),
    );
  });

  it('uses the primary filename for an untitled file submission', () => {
    const record = submission({
      files: [
        { id: 'file', fileName: 'landscape.png', order: 0 },
      ] as ISubmissionDto['files'],
    });
    expect(getScheduleTitle(record)).toBe('landscape.png');
    expect(buildScheduleEvents([submission()], 'Untitled')[0].title).toBe(
      'Untitled',
    );
  });

  it('keeps paused recurring schedules paused and omits their future previews', () => {
    const events = buildScheduleEvents(
      [
        submission({
          isScheduled: false,
          schedule: {
            scheduleType: ScheduleType.RECURRING,
            cron: '0 9 * * 5',
            scheduledFor: new Date(2026, 8, 11, 9).toISOString(),
          },
        }),
      ],
      'Untitled',
    );
    expect(events).toHaveLength(1);
    expect(events[0].classNames).toContain('schedule-event-paused');
    expect(events[0].extendedProps).toMatchObject({
      isScheduled: false,
      recurring: true,
    });
  });

  it('does not duplicate the next run and makes recurring previews non-draggable', () => {
    const events = buildScheduleEvents(
      [
        submission({
          schedule: {
            scheduleType: ScheduleType.RECURRING,
            cron: '0 9 * * 5',
            scheduledFor: new Date(2026, 8, 11, 9).toISOString(),
          },
        }),
      ],
      'Untitled',
    );
    expect(events).toHaveLength(4);
    expect(
      new Set(events.map((event) => new Date(event.start as string).getTime()))
        .size,
    ).toBe(4);
    expect(
      events
        .slice(1)
        .every(
          (event) =>
            event.editable === false &&
            event.extendedProps?.submissionId === 'submission-1',
        ),
    ).toBe(true);
  });

  it('keeps the scheduled event visible when a cron expression is invalid', () => {
    const events = buildScheduleEvents(
      [
        submission({
          schedule: {
            scheduleType: ScheduleType.RECURRING,
            cron: 'invalid',
            scheduledFor: new Date(2026, 8, 11, 9).toISOString(),
          },
        }),
      ],
      'Untitled',
    );
    expect(events).toHaveLength(1);
  });

  it('distinguishes message events and prevents moves while posting', () => {
    const record = submission({
      type: SubmissionType.MESSAGE,
      post: { completed: false, unitsOfWork: [] } as ISubmissionDto['post'],
    });
    const [event] = buildScheduleEvents([record], 'Untitled');
    expect(event.classNames).toContain('schedule-event-message');
    expect(event.editable).toBe(false);
  });
});
