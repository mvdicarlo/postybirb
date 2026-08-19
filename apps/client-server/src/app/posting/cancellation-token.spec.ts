import { CancellationToken } from './cancellation-token';

describe('CancellationToken', () => {
  it('starts active', () => {
    const token = new CancellationToken();

    expect(token.aborted).toBe(false);
    expect(token.signal.aborted).toBe(false);
    expect(() => token.throwIfAborted()).not.toThrow();
  });

  it('exposes a standard abort signal', () => {
    const token = new CancellationToken();
    const onAbort = jest.fn();
    token.signal.addEventListener('abort', onAbort);

    token.abort();

    expect(token.aborted).toBe(true);
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('throws the abort reason after cancellation', () => {
    const token = new CancellationToken();
    const reason = new Error('Posting cancelled');
    token.abort(reason);

    expect(() => token.throwIfAborted()).toThrow(reason);
  });
});
