import { PostErrorKind } from '@postybirb/types';
import { StageError } from './errors';
import {
    RelaySourceFile,
    SimulatedEncoder,
    TransformCache,
    WebsiteFileConstraints,
    buildTransformPlan,
    runTransform,
} from './transform';

const encoder = new SimulatedEncoder();

function img(over: Partial<RelaySourceFile> = {}): RelaySourceFile {
  return {
    id: over.id ?? 'f',
    fileName: over.fileName ?? 'f.jpg',
    mimeType: over.mimeType ?? 'image/jpeg',
    width: over.width ?? 4000,
    height: over.height ?? 4000,
    bytes: over.bytes ?? 12_000_000,
    hash: over.hash ?? 'hash-f',
    altText: over.altText,
    dimensionOverrides: over.dimensionOverrides,
  };
}

const weasyl: WebsiteFileConstraints = {
  acceptedMimeTypes: ['image/jpeg', 'image/png'],
  maxBytes: { '*': 250_000 },
  maxWidth: 2000,
  maxHeight: 2000,
  maxAltTextLength: 40,
  conversion: { 'image/webp': 'image/png' },
};

describe('Relay transform — plan + verify', () => {
  it('always produces output within the plan caps', async () => {
    const cache = new TransformCache();
    const files = [
      img({ id: 'a', mimeType: 'image/jpeg', width: 4000, height: 4000, bytes: 12_000_000 }),
      img({ id: 'b', mimeType: 'image/png', width: 3000, height: 3000, bytes: 9_000_000 }),
      img({ id: 'c', mimeType: 'image/webp', width: 1500, height: 1500, bytes: 800_000 }),
    ];
    for (const f of files) {
      const plan = buildTransformPlan(f, 'acct', weasyl);
      // eslint-disable-next-line no-await-in-loop
      const { output } = await runTransform(f, plan, cache, encoder);
      expect(output.bytes).toBeLessThanOrEqual(250_000);
      expect(output.width).toBeLessThanOrEqual(2000);
      expect(output.height).toBeLessThanOrEqual(2000);
      expect(weasyl.acceptedMimeTypes).toContain(output.mimeType);
    }
  });

  it('fails precisely when the byte cap is unreachable', async () => {
    const cache = new TransformCache();
    const f = img();
    const plan = buildTransformPlan(f, 'acct', {
      acceptedMimeTypes: ['image/jpeg'],
      maxBytes: { '*': 1 },
    });
    await expect(runTransform(f, plan, cache, encoder)).rejects.toMatchObject({
      kind: PostErrorKind.TRANSFORM_FAILED,
    } as Partial<StageError>);
  });

  it('truncates alt text to the website cap', async () => {
    const cache = new TransformCache();
    const f = img({ id: 'alt', width: 1000, height: 1000, bytes: 100_000, altText: 'x'.repeat(100) });
    const plan = buildTransformPlan(f, 'acct', weasyl);
    const { output } = await runTransform(f, plan, cache, encoder);
    expect(output.altText).toHaveLength(40);
  });

  it('serves identical (sourceHash + plan) transforms from cache', async () => {
    const cache = new TransformCache();
    const f = img({ id: 'cacheme', width: 2000, height: 2000, bytes: 3_000_000 });
    const plan = buildTransformPlan(f, 'acct', weasyl);
    const first = await runTransform(f, plan, cache, encoder);
    const second = await runTransform(f, plan, cache, encoder);
    expect(first.output.fromCache).toBe(false);
    expect(second.output.fromCache).toBe(true);
    expect(cache.hits).toBe(1);
    expect(cache.misses).toBe(1);
  });

  it('uses a swappable encoder and still enforces the verify gate', async () => {
    const cache = new TransformCache();
    const tiny = { encode: () => 1000 };
    const f = img();
    const plan = buildTransformPlan(f, 'acct', {
      acceptedMimeTypes: ['image/jpeg'],
      maxBytes: { '*': 2000 },
    });
    const { output, iterations } = await runTransform(f, plan, cache, tiny);
    expect(output.bytes).toBe(1000);
    expect(iterations).toHaveLength(1);
  });
});
