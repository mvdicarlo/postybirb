import type {
  DescriptionValue,
  UpdateWebsiteDescriptionDto,
} from '@postybirb/types';
import type { DescriptionSaveResult } from '../../../../../../api/website-options.api';
import { DescriptionDraft } from './description-draft';

function description(text: string): DescriptionValue {
  return {
    overrideDefault: false,
    description: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    },
  };
}
function deferred() {
  let resolve!: (value: DescriptionSaveResult) => void;
  const promise = new Promise<DescriptionSaveResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
describe('DescriptionDraft', () => {
  let server: DescriptionValue;
  let save: jest.Mock<
    Promise<DescriptionSaveResult>,
    [UpdateWebsiteDescriptionDto]
  >;
  let draft: DescriptionDraft;
  const onError = jest.fn();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    server = description('Original');
    save = jest.fn(async (update): Promise<DescriptionSaveResult> => {
      if (update.expectedRevision !== (server.version?.revision ?? 0)) {
        return { status: 'conflict', value: server };
      }
      server = {
        ...update.value,
        version: {
          revision: update.expectedRevision + 1,
          mutationId: update.mutationId,
          replacementRevision: server.version?.replacementRevision ?? 0,
        },
      };
      return { status: 'saved', value: server };
    });
    draft = new DescriptionDraft(server, save, onError);
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('updates immediately but waits exactly 1250ms to save only the description', async () => {
    draft.setValue(description('Draft'));
    expect(draft.getSnapshot().value).toEqual(description('Draft'));
    await jest.advanceTimersByTimeAsync(1249);
    expect(save).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      value: description('Draft'),
      expectedRevision: 0,
      mutationId: expect.any(String),
    });
    expect(draft.getSnapshot().status).toBe('idle');
  });
  it('serializes saves without replacing newer typing with an earlier acknowledgement', async () => {
    const first = deferred();
    const original = server;
    save.mockReturnValueOnce(first.promise);
    draft.setValue({
      ...description('First'),
      insertTitle: undefined,
      insertTags: undefined,
    });
    await jest.advanceTimersByTimeAsync(1250);
    const update = save.mock.calls[0][0];
    draft.setValue(description('Second'));
    await jest.advanceTimersByTimeAsync(1250);
    expect(save).toHaveBeenCalledTimes(1);
    const value: DescriptionValue = {
      ...JSON.parse(JSON.stringify(update.value)),
      version: {
        revision: 1,
        mutationId: update.mutationId,
        replacementRevision: 0,
      },
    };
    server = value;
    draft.receive(value);
    expect(draft.getSnapshot().value).toEqual(description('Second'));
    first.resolve({ status: 'saved', value });
    await jest.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].expectedRevision).toBe(1);
    expect(server.description).toEqual(description('Second').description);
    draft.receive(original);
    expect(draft.getSnapshot().value.description).toEqual(
      description('Second').description,
    );
    expect(draft.getSnapshot().status).toBe('idle');
    expect(onError).not.toHaveBeenCalled();
  });
  it('ignores a delayed pre-template save without clearing newer edits', async () => {
    const first = deferred();
    save.mockReturnValueOnce(first.promise);
    draft.setValue(description('Old draft'));
    await jest.advanceTimersByTimeAsync(1250);
    const update = save.mock.calls[0][0];
    server = {
      ...description('Template'),
      version: { revision: 2, mutationId: null, replacementRevision: 2 },
    };
    draft.receive(server);
    draft.setValue(description('Edited template'));
    await jest.advanceTimersByTimeAsync(1250);
    expect(save).toHaveBeenCalledTimes(1);

    first.resolve({
      status: 'saved',
      value: {
        ...update.value,
        version: {
          revision: 1,
          mutationId: update.mutationId,
          replacementRevision: 0,
        },
      },
    });
    await jest.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].expectedRevision).toBe(2);
    expect(draft.getSnapshot().value.description).toEqual(
      description('Edited template').description,
    );
    expect(draft.getSnapshot().status).toBe('idle');
  });
  it('applies intentional replacements equal to a historical draft and cancels discarded saves', async () => {
    draft.setValue(description('Template'));
    draft.setValue(description('Draft Template'));
    const replacement = {
      ...description('Template'),
      version: { revision: 1, mutationId: null, replacementRevision: 1 },
    };
    draft.receive(replacement);
    await jest.advanceTimersByTimeAsync(1250);
    expect(draft.getSnapshot().value).toEqual(replacement);
    expect(save).not.toHaveBeenCalled();
  });
  it('retains a same-description conflict until the user explicitly keeps or discards it', async () => {
    draft.setValue(description('Local'));
    server = {
      ...description('External'),
      version: { revision: 1, mutationId: null, replacementRevision: 0 },
    };
    draft.receive(server);
    await jest.advanceTimersByTimeAsync(1250);
    expect(draft.getSnapshot().status).toBe('conflict');
    expect(save).not.toHaveBeenCalled();
    draft.retry();
    await jest.advanceTimersByTimeAsync(0);
    expect(save.mock.calls[0][0].expectedRevision).toBe(1);
    expect(server.description).toEqual(description('Local').description);
  });
  it('detects conflicts in description flags as well as document content', () => {
    draft.setValue({ ...server, insertTitle: true });
    draft.receive({
      ...server,
      insertTags: true,
      version: { revision: 1, mutationId: null, replacementRevision: 0 },
    });
    expect(draft.getSnapshot().status).toBe('conflict');
    draft.discard();
    expect(draft.getSnapshot().value.insertTags).toBe(true);
    expect(draft.getSnapshot().value.insertTitle).toBeUndefined();
  });
  it('retains failed saves and supports retry', async () => {
    save.mockRejectedValueOnce(new Error('Offline'));
    draft.setValue(description('Draft'));
    await jest.advanceTimersByTimeAsync(1250);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(draft.getSnapshot().status).toBe('error');
    draft.retry();
    await jest.advanceTimersByTimeAsync(0);
    expect(draft.getSnapshot().status).toBe('idle');
    expect(server.description).toEqual(description('Draft').description);
  });
  it('stops rather than looping on a non-progressing conflict response', async () => {
    save.mockResolvedValueOnce({ status: 'conflict', value: server });
    draft.setValue(description('Draft'));
    await jest.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(draft.getSnapshot().status).toBe('error');
    expect(draft.getSnapshot().value).toEqual(description('Draft'));
  });
  it('flushes pending description edits on navigation', async () => {
    draft.setValue(description('Draft'));
    await draft.flush();
    await jest.advanceTimersByTimeAsync(1250);
    expect(save).toHaveBeenCalledTimes(1);
    expect(server.description).toEqual(description('Draft').description);
  });
});
