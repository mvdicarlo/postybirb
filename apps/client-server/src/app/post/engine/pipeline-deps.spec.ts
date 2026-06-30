/**
 * Unit coverage for the production {@link RelayPipelineDeps} adapter — the
 * bridge between the engine's abstract {@link PipelineDeps} seam and the real
 * services/DB. The orchestration engine is exercised elsewhere through mocked
 * seams (scheduler.integration.spec); these tests close the complementary gap
 * by verifying the bridge's own mapping and error-path logic in isolation.
 */

import { SubmissionType } from '@postybirb/types';
import { CancellableToken } from '../models/cancellable-token';
import { RelayJob, RelayTask } from './model';
import { RelayPipelineDeps } from './pipeline-deps';
import { MemoryRateStore, RateLimiter } from './rate-limiter';
import { RelayTracer } from './tracer.service';
import { WebsiteInstanceAdapter } from './websites';

// ---------------------------------------------------------------------------
// Mocks for the constructor dependencies
// ---------------------------------------------------------------------------

function makeWebsiteInstance(over: Record<string, unknown> = {}) {
  return {
    decoratedProps: {
      metadata: { name: 'furaffinity', displayName: 'FurAffinity' },
      fileOptions: {},
    },
    getLoginState: jest.fn().mockReturnValue({ isLoggedIn: true }),
    login: jest.fn().mockResolvedValue({ isLoggedIn: true }),
    ...over,
  };
}

type Mocks = {
  registry: { findInstance: jest.Mock };
  postParsers: { parse: jest.Mock };
  validation: { validate: jest.Mock };
  fileProcessor: { processBatch: jest.Mock };
  findById: jest.Mock;
};

function makeDeps(): { deps: RelayPipelineDeps } & Mocks {
  const registry = { findInstance: jest.fn() };
  const postParsers = { parse: jest.fn() };
  const validation = { validate: jest.fn() };
  const fileProcessor = { processBatch: jest.fn() };

  const deps = new RelayPipelineDeps(
    registry as never,
    postParsers as never,
    validation as never,
    fileProcessor as never,
    new RateLimiter(new MemoryRateStore()),
    new RelayTracer(),
  );

  // Replace the internally-instantiated repository with a controllable stub so
  // prepare() reads our hand-built submission rather than hitting the DB.
  const findById = jest.fn();
  (deps as unknown as { submissionRepository: { findById: jest.Mock } })
    .submissionRepository = { findById };

  return { deps, registry, postParsers, validation, fileProcessor, findById };
}

// ---------------------------------------------------------------------------
// Submission/file fixtures (raw DB shapes, loosely typed via casts)
// ---------------------------------------------------------------------------

function rawFile(over: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    fileName: 'f1.jpg',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
    size: 500_000,
    hash: 'h1',
    order: 0,
    metadata: {
      altText: 'alt',
      dimensions: { a1: { width: 600, height: 400 } },
      ignoredWebsites: ['a2'],
      sourceUrls: ['https://user/source'],
    },
    ...over,
  };
}

function rawSubmission(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    type: SubmissionType.FILE,
    getSubmissionName: () => 'My Title',
    files: [rawFile()],
    options: [
      { isDefault: true, accountId: 'def', account: { website: 'default' } },
      { isDefault: false, accountId: 'a1', account: { website: 'furaffinity' } },
      { isDefault: false, accountId: 'a2', account: { website: 'weasyl' } },
    ],
    ...over,
  };
}

describe('RelayPipelineDeps (production adapter bridge)', () => {
  describe('prepare()', () => {
    it('throws when the submission cannot be found', async () => {
      const { deps, findById } = makeDeps();
      findById.mockResolvedValue(undefined);
      const job = new RelayJob({ submissionId: 'missing' });
      await expect(deps.prepare(job)).rejects.toThrow(/Submission missing not found/);
    });

    it('maps submission fields and filters out the default option', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(makeWebsiteInstance());
      const job = new RelayJob({ submissionId: 's1' });

      const relay = await deps.prepare(job);

      expect(relay.id).toBe('s1');
      expect(relay.type).toBe(SubmissionType.FILE);
      expect(relay.title).toBe('My Title');
      // The default option is excluded; only the two real targets remain.
      expect(relay.options).toEqual([
        { accountId: 'a1', websiteId: 'furaffinity' },
        { accountId: 'a2', websiteId: 'weasyl' },
      ]);
    });

    it('falls back to the submission id when getSubmissionName is absent', async () => {
      const { deps, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission({ getSubmissionName: undefined }));
      const job = new RelayJob({ submissionId: 's1' });

      const relay = await deps.prepare(job);

      expect(relay.title).toBe('s1');
    });

    it('maps file metadata into RelaySourceFile (bytes<-size, dimension overrides)', async () => {
      const { deps, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const job = new RelayJob({ submissionId: 's1' });

      const relay = await deps.prepare(job);

      expect(relay.files).toHaveLength(1);
      expect(relay.files[0]).toMatchObject({
        id: 'f1',
        fileName: 'f1.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 800,
        bytes: 500_000, // size -> bytes
        hash: 'h1',
        altText: 'alt',
        order: 0,
        ignoredWebsites: ['a2'],
        sourceUrls: ['https://user/source'],
        dimensionOverrides: { a1: { width: 600, height: 400 } },
      });
    });

    it('applies defaults for missing order/metadata collections', async () => {
      const { deps, findById } = makeDeps();
      findById.mockResolvedValue(
        rawSubmission({
          files: [
            rawFile({
              order: undefined,
              metadata: { dimensions: undefined },
            }),
          ],
        }),
      );
      const job = new RelayJob({ submissionId: 's1' });

      const relay = await deps.prepare(job);

      expect(relay.files[0]).toMatchObject({
        order: 0,
        ignoredWebsites: [],
        sourceUrls: [],
        dimensionOverrides: {},
      });
      expect(relay.files[0].altText).toBeUndefined();
    });

    it('resolves only the website instances the registry knows about', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const fa = makeWebsiteInstance();
      // Registry resolves a1 only; a2 has no live instance.
      registry.findInstance.mockImplementation((account: { website: string }) =>
        account.website === 'furaffinity' ? fa : undefined,
      );
      const job = new RelayJob({ submissionId: 's1' });

      await deps.prepare(job);

      // a1 resolves to an adapter over the resolved instance...
      const website = deps.getWebsite(job.id, 'furaffinity', 'a1');
      expect(website).toBeInstanceOf(WebsiteInstanceAdapter);
      expect((website as WebsiteInstanceAdapter).instance).toBe(fa);
      // ...a2 was registered as a target but has no instance to resolve.
      expect(() => deps.getWebsite(job.id, 'weasyl', 'a2')).toThrow(
        /No website instance for weasyl:a2/,
      );
    });
  });

  describe('context lifecycle', () => {
    it('getSubmission throws before prepare and after release', async () => {
      const { deps, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const job = new RelayJob({ submissionId: 's1' });

      expect(() => deps.getSubmission(job.id)).toThrow(/not prepared/);

      await deps.prepare(job);
      expect(deps.getSubmission(job.id).id).toBe('s1');

      deps.release(job.id);
      expect(() => deps.getSubmission(job.id)).toThrow(/not prepared/);
    });
  });

  describe('authenticate()', () => {
    function taskFor(jobId: string, accountId = 'a1') {
      return new RelayTask({
        jobId,
        accountId,
        websiteId: 'furaffinity',
      });
    }

    it('throws when no instance is resolved for the account', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(undefined);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await expect(deps.authenticate(taskFor(job.id))).rejects.toThrow(
        /No website instance for furaffinity:a1/,
      );
    });

    it('does not re-login when already logged in', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const instance = makeWebsiteInstance();
      registry.findInstance.mockReturnValue(instance);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await deps.authenticate(taskFor(job.id));

      expect(instance.login).not.toHaveBeenCalled();
    });

    it('logs in when the session is not currently authenticated', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const instance = makeWebsiteInstance({
        getLoginState: jest.fn().mockReturnValue({ isLoggedIn: false }),
        login: jest.fn().mockResolvedValue({ isLoggedIn: true }),
      });
      registry.findInstance.mockReturnValue(instance);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await deps.authenticate(taskFor(job.id));

      expect(instance.login).toHaveBeenCalledTimes(1);
    });

    it('throws when re-login fails to establish a session', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const instance = makeWebsiteInstance({
        getLoginState: jest.fn().mockReturnValue({ isLoggedIn: false }),
        login: jest.fn().mockResolvedValue({ isLoggedIn: false }),
      });
      registry.findInstance.mockReturnValue(instance);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await expect(deps.authenticate(taskFor(job.id))).rejects.toThrow(
        /Not logged in to FurAffinity/,
      );
    });
  });

  describe('buildPostData()', () => {
    function taskFor(jobId: string, accountId = 'a1') {
      return new RelayTask({
        jobId,
        accountId,
        websiteId: 'furaffinity',
      });
    }

    it('parses via PostParsersService and passes upstream source URLs through', async () => {
      const { deps, registry, postParsers, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(makeWebsiteInstance());
      postParsers.parse.mockResolvedValue({ title: 'parsed' });
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      const result = await deps.buildPostData(taskFor(job.id), [
        'https://up/1',
      ]);

      expect(result).toEqual({
        postData: { title: 'parsed' },
        sourceUrls: ['https://up/1'],
      });
      expect(postParsers.parse).toHaveBeenCalledTimes(1);
    });

    it('throws when the account has no resolved instance/option', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(undefined);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await expect(
        deps.buildPostData(taskFor(job.id), []),
      ).rejects.toThrow(/Missing instance\/options for a1/);
    });
  });

  describe('validate()', () => {
    function taskFor(jobId: string, accountId = 'a1') {
      return new RelayTask({
        jobId,
        accountId,
        websiteId: 'furaffinity',
      });
    }

    it('maps validation errors to their ids', async () => {
      const { deps, registry, validation, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(makeWebsiteInstance());
      validation.validate.mockResolvedValue({
        errors: [{ id: 'e1' }, { id: 'e2' }],
      });
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      const errors = await deps.validate(taskFor(job.id), {
        postData: {},
        sourceUrls: [],
      });

      expect(errors).toEqual(['e1', 'e2']);
    });

    it('returns no errors when the account has no option', async () => {
      const { deps, registry, validation, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(makeWebsiteInstance());
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      const errors = await deps.validate(taskFor(job.id, 'unknown'), {
        postData: {},
        sourceUrls: [],
      });

      expect(errors).toEqual([]);
      expect(validation.validate).not.toHaveBeenCalled();
    });
  });

  describe('processBatch()', () => {
    function taskFor(jobId: string, accountId = 'a1') {
      return new RelayTask({
        jobId,
        accountId,
        websiteId: 'furaffinity',
      });
    }

    it('resolves files by id, forwards source URLs, and emits resize traces', async () => {
      const { deps, registry, fileProcessor, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      const instance = makeWebsiteInstance();
      registry.findInstance.mockReturnValue(instance);
      const posting = [{ id: 'f1' }];
      fileProcessor.processBatch.mockResolvedValue({
        files: posting,
        info: [{ fileId: 'f1', from: 500_000, to: 200_000 }],
      });
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);
      const task = taskFor(job.id);

      const result = await deps.processBatch(
        task,
        ['f1', 'unknown'],
        ['https://src/1'],
        new CancellableToken(),
      );

      expect(result).toBe(posting);
      // Only the known file id is hydrated and forwarded to the processor.
      const [, files, , accountId, sourceUrls] =
        fileProcessor.processBatch.mock.calls[0];
      expect(files).toHaveLength(1);
      expect(accountId).toBe('a1');
      expect(sourceUrls).toEqual(['https://src/1']);
      // A resize trace entry was emitted for the processed file.
      const resized = deps.tracer
        .getEntries(job.id)
        .find((e) => e.event === 'file.resized');
      expect(resized).toBeTruthy();
    });

    it('throws when the account has no resolved instance', async () => {
      const { deps, registry, findById } = makeDeps();
      findById.mockResolvedValue(rawSubmission());
      registry.findInstance.mockReturnValue(undefined);
      const job = new RelayJob({ submissionId: 's1' });
      await deps.prepare(job);

      await expect(
        deps.processBatch(taskFor(job.id), ['f1'], [], new CancellableToken()),
      ).rejects.toThrow(/No instance for a1/);
    });
  });
});
