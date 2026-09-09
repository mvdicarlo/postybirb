import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import Derpibooru from '../derpibooru/derpibooru.website';

const SIGNED_IN_HTML =
  '<div data-user-is-signed-in="true" data-user-name="tester"></div>';
const SIGNED_OUT_HTML = '<div data-user-is-signed-in="false"></div>';
const LOGOUT_HEADER =
  '<header><a href="/sessions" data-method="delete">Sign out</a></header>';

function createWebsite(body: unknown, statusCode = 200) {
  const get = jest.fn().mockResolvedValue({ body, statusCode });
  const platform = {
    http: { get },
    session: { getCookies: jest.fn().mockResolvedValue([]) },
  } as unknown as PlatformService;
  const account = new Account({
    id: 'account-1',
    name: 'Derpibooru',
    website: 'derpibooru',
  });

  return { get, website: new Derpibooru(account, platform) };
}

describe('Philomena login detection', () => {
  it('uses the structured indicator without requiring a Logout label', async () => {
    const { get, website } = createWebsite(SIGNED_IN_HTML);

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true, username: 'tester',
    });
    expect(get).toHaveBeenCalledWith('https://derpibooru.org', {
      partition: 'account-1',
    });
  });

  it('extracts the username from the session element, not unrelated content', async () => {
    const { website } = createWebsite(
      '<div data-user-name="unrelated"></div>' + SIGNED_IN_HTML,
    );

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true, username: 'tester',
    });
  });

  it('accepts an explicit signed-in indicator without a username', async () => {
    const { website } = createWebsite('<div data-user-is-signed-in="true"></div>');

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true, username: 'Unknown',
    });
  });

  it('prioritizes explicit signed-out state over logout content and fallback links', async () => {
    const { website } = createWebsite(
      SIGNED_OUT_HTML + '<article>Logout</article>' + LOGOUT_HEADER,
    );

    await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
  });

  it('supports a header logout action on variants without a session indicator', async () => {
    const { website } = createWebsite(
      '<div data-user-name="tester"></div>' + LOGOUT_HEADER,
    );

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true, username: 'tester',
    });
  });

  it.each([
    '',
    '<article>How to Logout</article>',
    '<article><a href="/sessions" data-method="delete">Logout</a></article>',
    '<header><a href="/sessions">Logout</a></header>',
    '<html><title>Just a moment...</title></html>',
    '<div data-user-is-signed-in="unknown"></div>' + LOGOUT_HEADER,
    { error: 'unexpected JSON' },
  ])('rejects an indeterminate response: %j', async (body) => {
    const { website } = createWebsite(body);

    await expect(website.onLogin()).rejects.toThrow('Unable to determine login state');
  });

  it.each([302, 401, 403, 429, 500, 503])(
    'rejects HTTP %s even if the response contains login indicators',
    async (statusCode) => {
      const { website } = createWebsite(SIGNED_IN_HTML, statusCode);

      await expect(website.onLogin()).rejects.toThrow(`HTTP ${statusCode}`);
    },
  );

  it.each([
    { statusCode: 503, body: 'Service unavailable' },
    { statusCode: 200, body: '<html><title>Just a moment...</title></html>' },
  ])('preserves the previous login state on an indeterminate check: %j', async (response) => {
    const { get, website } = createWebsite(SIGNED_IN_HTML);
    const previous = await website.login();
    expect(previous).toMatchObject({ isLoggedIn: true, username: 'tester' });
    get.mockResolvedValue(response);

    await expect(website.login()).resolves.toEqual(previous);
  });

  it('updates the previous login state when explicitly signed out', async () => {
    const { get, website } = createWebsite(SIGNED_IN_HTML);
    await website.login();
    get.mockResolvedValue({ statusCode: 200, body: SIGNED_OUT_HTML });

    await expect(website.login()).resolves.toMatchObject({ isLoggedIn: false });
  });
});