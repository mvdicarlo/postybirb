import {
  UpdateWebsiteDescriptionDto,
  WebsiteOptionsDto,
  DESCRIPTION_REVISION_CONFLICT,
} from '@postybirb/types';
import { Window } from 'happy-dom';

let api: typeof import('./website-options.api').default;
let HttpError: typeof import('../transports/http-client').HttpError;

function option(): WebsiteOptionsDto {
  const dates = {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return {
    ...dates,
    id: 'option',
    accountId: 'account',
    account: {
      ...dates,
      id: 'account',
      name: 'Account',
      website: 'test',
      groups: [],
    },
    isDefault: false,
    data: {
      title: 'Saved',
      description: {
        overrideDefault: false,
        description: { type: 'doc', content: [] },
        version: {
          revision: 1,
          mutationId: '00000000-0000-4000-8000-000000000001',
          replacementRevision: 0,
        },
      },
    },
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('WebsiteOptionsApi description-only saves', () => {
  let browser: Window;
  let fetchMock: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;
  const originalGlobals = new Map<string, PropertyDescriptor | undefined>();
  const update: UpdateWebsiteDescriptionDto = {
    value: {
      overrideDefault: false,
      description: { type: 'doc', content: [] },
    },
    expectedRevision: 0,
    mutationId: '00000000-0000-4000-8000-000000000001',
  };

  beforeAll(async () => {
    browser = new Window({ url: 'https://localhost' });
    browser.localStorage.setItem('remote_mode', 'client');
    browser.localStorage.setItem('remote_host', 'localhost:9487');
    const globals = { window: browser, localStorage: browser.localStorage };
    Object.entries(globals).forEach(([key, value]) => {
      originalGlobals.set(
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      );
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value,
      });
    });
    ({ default: api } = await import('./website-options.api'));
    ({ HttpError } = await import('../transports/http-client'));
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
    originalGlobals.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  it('sends the revision and mutation identity and returns the canonical acknowledgement', async () => {
    fetchMock.mockResolvedValueOnce(response(option()));
    await expect(api.saveDescription('option', update)).resolves.toEqual({
      status: 'saved',
      value: option().data.description,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify(update),
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('option/description');
  });

  it('reloads canonical options only for the explicit revision conflict response', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({ code: DESCRIPTION_REVISION_CONFLICT }, 409),
      )
      .mockResolvedValueOnce(response(option()));
    await expect(api.saveDescription('option', update)).resolves.toEqual({
      status: 'conflict',
      value: option().data.description,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'GET' });
  });

  it('does not reinterpret an unrelated conflict as a stale-save acknowledgement', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ message: 'Submission is being posted' }, 409),
    );
    await expect(api.saveDescription('option', update)).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
