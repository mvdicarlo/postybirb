import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { SUBMISSION_DELTA } from '@postybirb/socket-events';
import { ISubmissionDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { SubmissionService } from './services/submission.service';
import { SubmissionEventListener } from './submission-event.listener';
import {
    publishSubmissionProjectionChanged,
    publishSubmissionRemoved,
} from './submission.events';

function dto(id: string): ISubmissionDto {
  return { id } as ISubmissionDto;
}

describe('SubmissionEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  let listener: SubmissionEventListener;
  const findByIdsAsDto = jest.fn();
  const webSocketEmit = jest.fn();

  beforeEach(async () => {
    findByIdsAsDto.mockReset();
    webSocketEmit.mockReset();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SubmissionEventListener,
        {
          provide: SubmissionService,
          useValue: { findByIdsAsDto },
        },
        { provide: WSGateway, useValue: { emit: webSocketEmit } },
      ],
    }).compile();
    await module.init();
    eventEmitter = module.get(EventEmitter2);
    listener = module.get(SubmissionEventListener);
  });

  afterEach(async () => {
    await module.close();
  });

  async function drain(): Promise<void> {
    await (listener as any).drain();
  }

  it('coalesces changed and removed IDs into one delta', async () => {
    findByIdsAsDto.mockResolvedValue([dto('first')]);

    publishSubmissionProjectionChanged(eventEmitter, ['first', 'second']);
    publishSubmissionRemoved(eventEmitter, 'second');
    await drain();

    expect(findByIdsAsDto).toHaveBeenCalledWith(['first']);
    expect(webSocketEmit).toHaveBeenCalledWith({
      event: SUBMISSION_DELTA,
      data: { upserts: [dto('first')], removedIds: ['second'] },
    });
  });

  it('projects missing or uninitialized changed records as removals', async () => {
    findByIdsAsDto.mockResolvedValue([]);

    publishSubmissionProjectionChanged(eventEmitter, 'missing');
    await drain();

    expect(webSocketEmit).toHaveBeenCalledWith({
      event: SUBMISSION_DELTA,
      data: { upserts: [], removedIds: ['missing'] },
    });
  });

  it('immediately drains pending IDs when requested', async () => {
    findByIdsAsDto.mockResolvedValue([dto('first'), dto('second')]);

    publishSubmissionProjectionChanged(eventEmitter, 'first');
    expect(findByIdsAsDto).not.toHaveBeenCalled();

    publishSubmissionProjectionChanged(eventEmitter, 'second', true);
    expect(findByIdsAsDto).toHaveBeenCalledWith(['first', 'second']);

    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    expect(webSocketEmit).toHaveBeenCalledWith({
      event: SUBMISSION_DELTA,
      data: {
        upserts: [dto('first'), dto('second')],
        removedIds: [],
      },
    });
  });

  it('does not emit a stale upsert when removal arrives during validation', async () => {
    let resolveProjection: (dtos: ISubmissionDto[]) => void = () => undefined;
    findByIdsAsDto.mockImplementationOnce(
      () =>
        new Promise<ISubmissionDto[]>((resolve) => {
          resolveProjection = resolve;
        }),
    );
    findByIdsAsDto.mockResolvedValueOnce([]);

    publishSubmissionProjectionChanged(eventEmitter, 'first');
    const firstDrain = (listener as any).drain();
    publishSubmissionRemoved(eventEmitter, 'first');
    resolveProjection([dto('first')]);
    await firstDrain;
    await drain();

    expect(webSocketEmit).toHaveBeenCalledTimes(1);
    expect(webSocketEmit).toHaveBeenCalledWith({
      event: SUBMISSION_DELTA,
      data: { upserts: [], removedIds: ['first'] },
    });
  });

  it('cancels pending projection delivery during teardown', async () => {
    publishSubmissionProjectionChanged(eventEmitter, 'first');

    await module.close();

    expect(findByIdsAsDto).not.toHaveBeenCalled();
    expect(webSocketEmit).not.toHaveBeenCalled();
  });
});
