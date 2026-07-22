import {
    AccountRepository,
    clearDatabase,
    PostQueueRecordRepository,
    SettingsRepository,
    Submission,
    SubmissionRepository,
    SubscriberBus,
    WebsiteOptionsRepository,
} from '@postybirb/database';
import {
    ISubmissionDelta,
    ISubmissionDto,
    ScheduleType,
    SettingsConstants,
    SubmissionType,
} from '@postybirb/types';
import { ValidationService } from '../../validation/validation.service';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { SubmissionDeltaService } from './submission-delta.service';

describe('SubmissionDeltaService', () => {
  let service: SubmissionDeltaService;
  let repository: SubmissionRepository;
  let validateSubmission: jest.Mock;
  let emit: jest.Mock;

  beforeEach(() => {
    clearDatabase();
    repository = new SubmissionRepository();
    validateSubmission = jest.fn().mockResolvedValue([]);
    emit = jest.fn();
    service = new SubmissionDeltaService(
      { validateSubmission } as unknown as ValidationService,
      { emit } as unknown as WSGateway,
    );
  });

  afterEach(() => {
    clearDatabase();
  });

  async function seedSubmission(isArchived = false, isInitialized = true) {
    return repository.insert(
      new Submission({
        type: SubmissionType.MESSAGE,
        isScheduled: false,
        isMultiSubmission: false,
        isTemplate: false,
        isArchived,
        isInitialized,
        schedule: { scheduleType: ScheduleType.NONE },
        metadata: {},
        order: 1,
      }),
    );
  }

  async function flushDeltas() {
    SubscriberBus.flush();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  function lastDelta(): ISubmissionDelta {
    return emit.mock.calls.at(-1)[0].data as ISubmissionDelta;
  }

  it('validates and emits only the updated submission', async () => {
    const first = await seedSubmission(true);
    await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();
    validateSubmission.mockClear();

    await repository.update(first.id, { isArchived: false });
    await flushDeltas();

    expect(validateSubmission).toHaveBeenCalledTimes(1);
    expect(validateSubmission.mock.calls[0][0].id).toBe(first.id);
    expect(lastDelta().upserts.map((dto) => dto.id)).toEqual([first.id]);
    expect(lastDelta().removals).toEqual([]);
  });

  it('does not validate archived submission upserts', async () => {
    const submission = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();
    validateSubmission.mockClear();

    await repository.update(submission.id, { order: 2 });
    await flushDeltas();

    expect(validateSubmission).not.toHaveBeenCalled();
    expect(lastDelta().upserts[0].validations).toEqual([]);
  });

  it('resolves queue record updates to their parent submission', async () => {
    const submission = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();

    await new PostQueueRecordRepository().insert({
      submissionId: submission.id,
    });
    await flushDeltas();

    expect(lastDelta().upserts[0].id).toBe(submission.id);
    expect(lastDelta().upserts[0].postQueueRecord).toBeDefined();
  });

  it('routes account updates only to submissions using that account', async () => {
    const first = await seedSubmission();
    const second = await seedSubmission();
    const accountId = 'account-id';
    const accountRepository = new AccountRepository();
    const optionsRepository = new WebsiteOptionsRepository();
    await accountRepository.insert({
      id: accountId,
      name: 'Account',
      website: 'test',
      groups: [],
    });
    await optionsRepository.insert({
      accountId,
      submissionId: first.id,
      data: {},
      isDefault: false,
    });
    await flushDeltas();
    emit.mockClear();
    validateSubmission.mockClear();

    await accountRepository.update(accountId, { name: 'Updated Account' });
    await flushDeltas();

    expect(lastDelta().upserts.map((dto) => dto.id)).toEqual([first.id]);
    expect(lastDelta().upserts.map((dto) => dto.id)).not.toContain(second.id);
    expect(validateSubmission).toHaveBeenCalledTimes(1);
    expect(validateSubmission.mock.calls[0][0].id).toBe(first.id);
  });

  it('revalidates active submissions when a parser dependency changes', async () => {
    const active = await seedSubmission();
    const archived = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();
    validateSubmission.mockClear();

    await new SettingsRepository().insert({
      profile: 'delta-test',
      settings: SettingsConstants.DEFAULT_SETTINGS,
    });
    await flushDeltas();

    expect(lastDelta().upserts.map((dto) => dto.id)).toEqual([active.id]);
    expect(lastDelta().upserts.map((dto) => dto.id)).not.toContain(archived.id);
    expect(validateSubmission).toHaveBeenCalledTimes(1);
    expect(validateSubmission.mock.calls[0][0].id).toBe(active.id);
  });

  it('emits only the ID when a submission is deleted', async () => {
    const submission = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();

    await repository.deleteById([submission.id]);
    await flushDeltas();

    expect(lastDelta()).toEqual({
      upserts: [],
      removals: [submission.id],
    });
  });

  it('does not emit uninitialized submissions', async () => {
    await seedSubmission(false, false);
    await flushDeltas();

    expect(emit).not.toHaveBeenCalled();
  });

  it('deduplicates IDs and gives removal precedence', async () => {
    const submission = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();

    service.emitUpserts([submission.id, submission.id]);
    service.emitRemovals(submission.id);
    await flushDeltas();

    expect(lastDelta()).toEqual({
      upserts: [],
      removals: [submission.id],
    });
  });

  it('serializes a second update that arrives during validation', async () => {
    const submission = await seedSubmission(true);
    await flushDeltas();
    emit.mockClear();

    let finishValidation: (value: []) => void = () => undefined;
    validateSubmission.mockImplementationOnce(
      () =>
        new Promise<[]>(resolve => {
          finishValidation = resolve;
        }),
    );

    await repository.update(submission.id, { isArchived: false });
    SubscriberBus.flush();
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

    await repository.update(submission.id, { order: 2 });
    SubscriberBus.flush();
    finishValidation([]);
    await flushDeltas();

    expect(emit).toHaveBeenCalledTimes(2);
    const emittedDtos = emit.mock.calls.map(
      (call) => (call[0].data.upserts as ISubmissionDto[])[0],
    );
    expect(emittedDtos.map((dto) => dto.order)).toEqual([1, 2]);
  });
});