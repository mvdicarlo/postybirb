import { SubmissionRepository } from '@postybirb/database';
import { SubmissionType } from '@postybirb/types';
import { RelayPreviewService } from './preview.service';

type AnyObj = Record<string, unknown>;

function makeFile(over: AnyObj = {}): AnyObj {
  return {
    id: 'f1',
    fileName: 'f1.png',
    width: 2000,
    height: 2000,
    size: 1_000_000,
    mimeType: 'image/png',
    metadata: {},
    ...over,
  };
}

function makeSubmission(over: AnyObj = {}): AnyObj {
  return {
    id: 's1',
    type: SubmissionType.FILE,
    files: [makeFile()],
    options: [
      {
        isDefault: false,
        accountId: 'a1',
        account: { website: 'weasyl' },
      },
    ],
    ...over,
  };
}

describe('RelayPreviewService', () => {
  let findById: jest.SpyInstance;

  afterEach(() => {
    findById?.mockRestore();
  });

  function build(opts: {
    submission: AnyObj | null;
    instance?: AnyObj | null;
    processBatch?: jest.Mock;
  }): RelayPreviewService {
    findById = jest
      .spyOn(SubmissionRepository.prototype, 'findById')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue(opts.submission as any);

    const registry = {
      findInstance: jest.fn().mockReturnValue(opts.instance ?? null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const processor = {
      processBatch:
        opts.processBatch ??
        jest.fn().mockResolvedValue({
          files: [],
          info: [
            {
              fileId: 'f1',
              from: { width: 2000, height: 2000, bytes: 1_000_000, mimeType: 'image/png' },
              to: { width: 1280, height: 1280, bytes: 400_000, mimeType: 'image/jpeg' },
            },
          ],
        }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    return new RelayPreviewService(registry, processor);
  }

  it('throws when the submission does not exist', async () => {
    const service = build({ submission: null });
    await expect(service.preview('missing')).rejects.toThrow(/not found/);
  });

  it('reports the file website as unsupported when no instance resolves', async () => {
    const service = build({ submission: makeSubmission(), instance: null });
    const result = await service.preview('s1');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].supported).toBe(false);
    expect(result.tasks[0].files).toHaveLength(0);
  });

  it('returns before/after dimensions from the file processor', async () => {
    const service = build({
      submission: makeSubmission(),
      instance: { supportsFile: true },
    });
    const result = await service.preview('s1');
    const [task] = result.tasks;
    expect(task.supported).toBe(true);
    expect(task.files[0].from.bytes).toBe(1_000_000);
    expect(task.files[0].to).toEqual({
      width: 1280,
      height: 1280,
      bytes: 400_000,
      mimeType: 'image/jpeg',
    });
  });

  it('marks files excluded for the account without processing them', async () => {
    const processBatch = jest.fn();
    const service = build({
      submission: makeSubmission({
        files: [makeFile({ metadata: { ignoredWebsites: ['a1'] } })],
      }),
      instance: { supportsFile: true },
      processBatch,
    });
    const result = await service.preview('s1');
    expect(result.tasks[0].files[0].excluded).toBe(true);
    expect(processBatch).not.toHaveBeenCalled();
  });

  it('captures a per-file error when processing fails', async () => {
    const processBatch = jest.fn().mockRejectedValue(new Error('unsupported type'));
    const service = build({
      submission: makeSubmission(),
      instance: { supportsFile: true },
      processBatch,
    });
    const result = await service.preview('s1');
    expect(result.tasks[0].files[0].error).toMatch(/unsupported type/);
  });

  it('skips default options', async () => {
    const service = build({
      submission: makeSubmission({
        options: [
          { isDefault: true, accountId: 'def', account: { website: 'default' } },
          { isDefault: false, accountId: 'a1', account: { website: 'weasyl' } },
        ],
      }),
      instance: { supportsFile: true },
    });
    const result = await service.preview('s1');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].accountId).toBe('a1');
  });
});
