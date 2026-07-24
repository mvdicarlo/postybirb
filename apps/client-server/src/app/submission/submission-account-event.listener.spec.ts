import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { IAccountDto, SubmissionType } from '@postybirb/types';
import {
    publishAccountRemoved,
    publishAccountStateChanged,
} from '../account/account.events';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import {
    SubmissionAccountEventListener,
    canonicalStringify,
} from './submission-account-event.listener';
import { SubmissionEventPublisher } from './submission-event.publisher';

function account(pending = false): IAccountDto {
  return {
    id: 'account',
    state: { pending },
  } as IAccountDto;
}

describe('SubmissionAccountEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  let listener: SubmissionAccountEventListener;
  const instance = { accountId: 'account' };
  const waitForInitialization = jest.fn();
  const getAll = jest.fn();
  const findInstance = jest.fn();
  const markChanged = jest.fn();

  async function flush(): Promise<void> {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  beforeEach(async () => {
    waitForInitialization.mockReset().mockResolvedValue(undefined);
    getAll.mockReset().mockReturnValue([]);
    findInstance.mockReset().mockReturnValue(instance);
    markChanged.mockReset();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SubmissionAccountEventListener,
        {
          provide: WebsiteRegistryService,
          useValue: { waitForInitialization, getAll, findInstance },
        },
        {
          provide: SubmissionEventPublisher,
          useValue: { markChanged },
        },
      ],
    }).compile();
    listener = module.get(SubmissionAccountEventListener);
    jest.spyOn(listener as never, 'buildFingerprints' as never).mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'initial-file'],
        [SubmissionType.MESSAGE, 'initial-message'],
      ]) as never,
    );
    (listener as any).websiteOptionsRepository.find = jest
      .fn()
      .mockResolvedValue([
        {
          submissionId: 'file-submission',
          submission: { type: SubmissionType.FILE },
        },
        {
          submissionId: 'message-submission',
          submission: { type: SubmissionType.MESSAGE },
        },
      ]);
    await module.init();
    eventEmitter = module.get(EventEmitter2);
    await flush();
  });

  afterEach(async () => {
    await module.close();
  });

  it('canonicalizes objects without changing array order', () => {
    expect(canonicalStringify({ b: 2, a: [{ d: 4, c: 3 }] })).toBe(
      '{"a":[{"c":3,"d":4}],"b":2}',
    );
  });

  it('establishes the first settled fingerprint without fan-out', async () => {
    publishAccountStateChanged(eventEmitter, account());
    await flush();

    expect(markChanged).not.toHaveBeenCalled();
  });

  it('ignores pending events without changing the settled baseline', async () => {
    await (listener as any).handleAccountChanged(account());
    (listener as any).buildFingerprints.mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'changed-file'],
        [SubmissionType.MESSAGE, 'initial-message'],
      ]),
    );

    await (listener as any).handleAccountChanged(account(true));
    await (listener as any).handleAccountChanged(account());

    expect(markChanged).toHaveBeenCalledWith(['file-submission']);
  });

  it('invalidates only submissions using a changed form type', async () => {
    await (listener as any).handleAccountChanged(account());
    (listener as any).buildFingerprints.mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'initial-file'],
        [SubmissionType.MESSAGE, 'changed-message'],
      ]),
    );

    await (listener as any).handleAccountChanged(account());

    expect(markChanged).toHaveBeenCalledWith(['message-submission']);
  });

  it('retains changed types across overlapping option lookups', async () => {
    await (listener as any).handleAccountChanged(account());
    const options = [
      {
        submissionId: 'file-submission',
        submission: { type: SubmissionType.FILE },
      },
      {
        submissionId: 'message-submission',
        submission: { type: SubmissionType.MESSAGE },
      },
    ];
    let resolveFirst: (options: unknown[]) => void = () => undefined;
    (listener as any).websiteOptionsRepository.find
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(options);

    (listener as any).buildFingerprints.mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'changed-file'],
        [SubmissionType.MESSAGE, 'initial-message'],
      ]),
    );
    const first = (listener as any).handleAccountChanged(account());

    (listener as any).buildFingerprints.mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'changed-file'],
        [SubmissionType.MESSAGE, 'changed-message'],
      ]),
    );
    await (listener as any).handleAccountChanged(account());
    resolveFirst(options);
    await first;

    expect(markChanged).toHaveBeenCalledTimes(1);
    expect(markChanged).toHaveBeenCalledWith([
      'file-submission',
      'message-submission',
    ]);
  });

  it('clears account fingerprint state when the account is removed', async () => {
    publishAccountStateChanged(eventEmitter, account());
    await flush();
    publishAccountRemoved(eventEmitter, 'account');
    (listener as any).buildFingerprints.mockReturnValue(
      new Map([
        [SubmissionType.FILE, 'changed-file'],
        [SubmissionType.MESSAGE, 'initial-message'],
      ]),
    );

    publishAccountStateChanged(eventEmitter, account());
    await flush();

    expect(markChanged).not.toHaveBeenCalled();
  });
});
