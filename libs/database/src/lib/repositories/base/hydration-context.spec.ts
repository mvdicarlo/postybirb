import { HydrationContext } from './hydration-context';

interface Node {
  id: string;
  label?: string;
  child?: Node;
  parent?: Node;
}

describe('HydrationContext', () => {
  it('returns the same instance for repeated (schemaKey, id)', () => {
    const ctx = new HydrationContext();
    const a = ctx.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    const b = ctx.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    expect(a).toBe(b);
  });

  it('only invokes `construct` once per (schemaKey, id)', () => {
    const ctx = new HydrationContext();
    const construct = jest.fn(() => ({ id: '1' }));
    ctx.getOrCreate('AccountSchema', '1', construct);
    ctx.getOrCreate('AccountSchema', '1', construct);
    ctx.getOrCreate('AccountSchema', '1', construct);
    expect(construct).toHaveBeenCalledTimes(1);
  });

  it('produces distinct instances for different ids', () => {
    const ctx = new HydrationContext();
    const a = ctx.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    const b = ctx.getOrCreate<Node>('AccountSchema', '2', () => ({ id: '2' }));
    expect(a).not.toBe(b);
  });

  it('produces distinct instances for different schemaKey with same id', () => {
    const ctx = new HydrationContext();
    const a = ctx.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    const b = ctx.getOrCreate<Node>('SubmissionSchema', '1', () => ({
      id: '1',
    }));
    expect(a).not.toBe(b);
  });

  it('separate contexts do not share identity', () => {
    const ctxA = new HydrationContext();
    const ctxB = new HydrationContext();
    const a = ctxA.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    const b = ctxB.getOrCreate<Node>('AccountSchema', '1', () => ({ id: '1' }));
    expect(a).not.toBe(b);
  });

  it('register-before-populate: back-reference inside `populate` resolves to the in-construction shell', () => {
    const ctx = new HydrationContext();
    const parent = ctx.getOrCreate<Node>(
      'SubmissionSchema',
      'p',
      () => ({ id: 'p', label: 'parent' }),
      (p) => {
        // While populating the parent, recurse into a child that itself
        // back-references the parent. The back-reference must resolve to
        // the same `p` instance, not trigger re-construction.
        p.child = ctx.getOrCreate<Node>(
          'WebsiteOptionsSchema',
          'c',
          () => ({ id: 'c', label: 'child' }),
          (c) => {
            c.parent = ctx.getOrCreate<Node>(
              'SubmissionSchema',
              'p',
              () => {
                throw new Error(
                  'construct should not be called for back-reference',
                );
              },
            );
          },
        );
      },
    );

    expect(parent.child?.parent).toBe(parent);
  });

  it('exposes cache size for diagnostics', () => {
    const ctx = new HydrationContext();
    expect(ctx.size).toBe(0);
    ctx.getOrCreate('AccountSchema', '1', () => ({ id: '1' }));
    ctx.getOrCreate('AccountSchema', '2', () => ({ id: '2' }));
    expect(ctx.size).toBe(2);
  });
});
