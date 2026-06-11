import { SubmissionType } from '@postybirb/types';
import { RelaySubmission } from './pipeline';
import { RelayPipelineDeps } from './pipeline-deps';
import { RelayPreviewService } from './preview.service';
import { SimulatedEncoder, TransformCache } from './transform';
import { RelayWebsite } from './websites';

function fileWebsite(over: Partial<RelayWebsite> = {}): RelayWebsite {
  return {
    id: over.id ?? 'weasyl',
    displayName: over.displayName ?? 'Weasyl',
    supportsFile: over.supportsFile ?? true,
    supportsMessage: over.supportsMessage ?? false,
    minimumPostWaitInterval: 0,
    rateLimitScope: 'account',
    fileBatchSize: over.fileBatchSize ?? 3,
    acceptsExternalSourceUrls: false,
    sourceDependencyMode: 'all',
    fileConstraints: over.fileConstraints ?? {
      acceptedMimeTypes: ['image/jpeg', 'image/png'],
      maxBytes: { '*': 250_000 },
      maxWidth: 2000,
      maxHeight: 2000,
      conversion: { 'image/webp': 'image/png' },
    },
  };
}

/**
 * Minimal stub of RelayPipelineDeps exposing only what the preview service
 * uses: loadSubmission, getSubmission, getWebsite, cache, encoder.
 */
class StubDeps {
  cache = new TransformCache();

  encoder = new SimulatedEncoder();

  private submission: RelaySubmission;

  private readonly websites = new Map<string, RelayWebsite>();

  constructor(submission: RelaySubmission, sites: RelayWebsite[]) {
    this.submission = submission;
    for (const s of sites) this.websites.set(s.id, s);
  }

  async loadSubmission(): Promise<RelaySubmission> {
    return this.submission;
  }

  getSubmission(): RelaySubmission {
    return this.submission;
  }

  getWebsite(websiteId: string): RelayWebsite {
    const site = this.websites.get(websiteId);
    if (!site) throw new Error(`no website ${websiteId}`);
    return site;
  }
}

function submission(): RelaySubmission {
  return {
    id: 's1',
    type: SubmissionType.FILE,
    title: 'Preview Test',
    files: [
      { id: 'big', fileName: 'big.jpg', mimeType: 'image/jpeg', width: 4000, height: 4000, bytes: 12_000_000, hash: 'h1', order: 0 },
      { id: 'webp', fileName: 's.webp', mimeType: 'image/webp', width: 1500, height: 1500, bytes: 800_000, hash: 'h2', order: 1, ignoredWebsites: ['a_fa'] },
    ] as RelaySubmission['files'],
    options: [
      { accountId: 'a_ws', websiteId: 'weasyl' },
      { accountId: 'a_fa', websiteId: 'furaffinity' },
    ],
  };
}

describe('RelayPreviewService', () => {
  function makeService(): RelayPreviewService {
    const deps = new StubDeps(submission(), [
      fileWebsite({ id: 'weasyl' }),
      fileWebsite({ id: 'furaffinity', fileBatchSize: 1 }),
    ]);
    return new RelayPreviewService(deps as unknown as RelayPipelineDeps);
  }

  it('returns resize results per website without dispatching', async () => {
    const result = await makeService().preview('s1');
    expect(result.tasks).toHaveLength(2);

    const ws = result.tasks.find((t) => t.websiteId === 'weasyl')!;
    expect(ws.supported).toBe(true);
    const big = ws.files.find((f) => f.fileId === 'big')!;
    expect(big.to!.bytes).toBeLessThanOrEqual(250_000);
    expect(big.to!.width).toBeLessThanOrEqual(2000);
    expect(big.verifyIterations).toBeGreaterThan(0);
  });

  it('marks files excluded for a website as excluded', async () => {
    const result = await makeService().preview('s1');
    const fa = result.tasks.find((t) => t.websiteId === 'furaffinity')!;
    const webp = fa.files.find((f) => f.fileId === 'webp')!;
    expect(webp.excluded).toBe(true);
    expect(webp.to).toBeUndefined();
  });

  it('records a transform error instead of throwing', async () => {
    const deps = new StubDeps(submission(), [
      fileWebsite({
        id: 'weasyl',
        fileConstraints: { acceptedMimeTypes: ['image/jpeg'], maxBytes: { '*': 1 } },
      }),
      fileWebsite({ id: 'furaffinity' }),
    ]);
    const service = new RelayPreviewService(deps as unknown as RelayPipelineDeps);
    const result = await service.preview('s1');
    const ws = result.tasks.find((t) => t.websiteId === 'weasyl')!;
    const big = ws.files.find((f) => f.fileId === 'big')!;
    expect(big.error).toBeTruthy();
    expect(big.to).toBeUndefined();
  });
});
