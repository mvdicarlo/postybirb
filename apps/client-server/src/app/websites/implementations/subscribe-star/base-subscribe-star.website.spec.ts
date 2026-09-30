import BaseSubscribeStar from './base-subscribe-star.website';

jest.mock('../../website', () => ({ Website: class {} }));
jest.mock('./models/subscribe-star-file-submission', () => ({}));
jest.mock('./models/subscribe-star-message-submission', () => ({}));

interface SubscribeStarHarness {
  onLogin(): Promise<{ loggedIn: boolean }>;
  getPostData(): Promise<unknown>;
  sessionData: { profileUrl?: string; csrfToken?: string; userId?: string };
}

describe('SubscribeStar login and profile URL', () => {
  const baseUrl = 'https://www.subscribestar.com';
  const httpGet = jest.fn();
  const runScriptOnPage = jest.fn();
  const warn = jest.fn();
  const setWebsiteData = jest.fn();
  let website: SubscribeStarHarness;

  beforeEach(() => {
    jest.resetAllMocks();
    website = Object.assign(Object.create(BaseSubscribeStar.prototype), {
      BASE_URL: baseUrl,
      accountId: 'test-account',
      username: 'Studio Display Name',
      sessionData: {},
      setWebsiteData,
      logger: { warn, error: jest.fn() },
      platform: {
        http: { get: httpGet },
        browser: { runScriptOnPage },
      },
    });
  });

  const loginPage = (menu: string) => `
    <meta name="csrf-token" content="test-csrf-token">
    <div class="top_bar-user_info">
      <div class="top_bar-user_name">Studio Display Name</div>
      <img data-user-id="test-user-id">
    </div>
    ${menu}
    <div class="for-tier_settings">
      <div class="tiers-settings_item" data-id="test-tier">
        <div class="tiers-settings_item-title">Supporter</div>
        <div class="tiers-settings_item-cost">$5</div>
      </div>
    </div>
  `;

  const embeddedMenu = (href: string) => {
    const html = `<a class="user_menu-item for-star" href="${href}">My Profile Page</a>`;
    return `<div data-safe-html="${JSON.stringify(html).replace(/"/g, '&quot;')}"></div>`;
  };

  it.each(['https://www.subscribestar.com', 'https://www.subscribestar.art'])(
    'uses the embedded profile link for posting on %s while preserving the display name',
    async (instanceUrl) => {
      Object.assign(website, { BASE_URL: instanceUrl });
      website.sessionData = {
        profileUrl: `${instanceUrl}/previous-creator`,
        csrfToken: 'previous-csrf-token',
        userId: 'previous-user-id',
      };
      httpGet.mockResolvedValue({
        body: loginPage(embeddedMenu('/creator-handle')),
        statusCode: 200,
        responseUrl: `${instanceUrl}/profile/settings`,
      });
      const tokens = {
        authenticityToken: 'test-authenticity-token',
        s3UploadPath: 'test-upload-path',
        s3Url: 'https://test-bucket.s3.amazonaws.com',
        csrfToken: 'test-csrf-token',
      };
      runScriptOnPage.mockResolvedValue(tokens);

      await expect(website.onLogin()).resolves.toEqual({
        loggedIn: true,
        username: 'Studio Display Name',
      });
      expect(website.sessionData).toEqual({
        profileUrl: `${instanceUrl}/creator-handle`,
        csrfToken: 'test-csrf-token',
        userId: 'test-user-id',
      });
      await expect(website.getPostData()).resolves.toEqual(tokens);
      expect(runScriptOnPage).toHaveBeenCalledWith(
        'test-account',
        `${instanceUrl}/creator-handle`,
        expect.any(String),
        1_000,
      );
      expect(setWebsiteData).toHaveBeenCalledWith({
        tiers: [
          { label: 'Public', value: 'free', mutuallyExclusive: true },
          { label: 'Supporter ($5)', value: 'test-tier' },
        ],
      });
    },
  );

  it('does not guess a profile URL when the link is missing and there is no previous session', async () => {
    httpGet.mockResolvedValue({
      body: loginPage(''),
      statusCode: 200,
      responseUrl: `${baseUrl}/profile/settings`,
    });

    await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    expect(website.sessionData.profileUrl).toBeUndefined();
    await expect(website.getPostData()).rejects.toThrow(
      'Missing profile page URL',
    );
    expect(runScriptOnPage).not.toHaveBeenCalled();
  });

  it('preserves existing session data when the login request fails', async () => {
    const previousSession = {
      profileUrl: `${baseUrl}/previous-creator`,
      csrfToken: 'previous-csrf-token',
      userId: 'previous-user-id',
    };
    website.sessionData = { ...previousSession };
    const error = new Error('Connection reset');
    httpGet.mockRejectedValue(error);

    await expect(website.onLogin()).rejects.toBe(error);
    expect(website.sessionData).toEqual(previousSession);
  });

  it('preserves existing session data when the response has no profile link', async () => {
    const previousSession = {
      profileUrl: `${baseUrl}/previous-creator`,
      csrfToken: 'previous-csrf-token',
      userId: 'previous-user-id',
    };
    website.sessionData = { ...previousSession };
    httpGet.mockResolvedValue({
      body: loginPage(''),
      statusCode: 200,
      responseUrl: `${baseUrl}/profile/settings`,
    });

    await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    expect(website.sessionData).toEqual(previousSession);
  });

  it('skips empty, malformed, and unrelated embedded templates', async () => {
    httpGet.mockResolvedValue({
      body: loginPage(`
        <div data-safe-html></div>
        <div data-safe-html="not-json"></div>
        <div data-safe-html="null"></div>
        <div data-safe-html="&quot;&lt;div&gt;Other menu&lt;/div&gt;&quot;"></div>
        ${embeddedMenu('/creator-handle')}
      `),
      statusCode: 200,
      responseUrl: `${baseUrl}/profile/settings`,
    });

    await expect(website.onLogin()).resolves.toMatchObject({ loggedIn: true });
    expect(website.sessionData.profileUrl).toBe(`${baseUrl}/creator-handle`);
  });

  it('accepts an already-rendered profile link on the canonical host', async () => {
    httpGet.mockResolvedValue({
      body: loginPage(
        '<a class="user_menu-item for-star" href="https://subscribestar.com/creator-handle">My Profile Page</a>',
      ),
      statusCode: 200,
      responseUrl: 'https://subscribestar.com/profile/settings',
    });

    await expect(website.onLogin()).resolves.toMatchObject({ loggedIn: true });
    expect(website.sessionData.profileUrl).toBe(
      'https://subscribestar.com/creator-handle',
    );
  });

  it.each([
    'https://other.example/creator-handle',
    'https://www.subscribestar.art/creator-handle',
    'http://www.subscribestar.com/creator-handle',
    'https://user:password@www.subscribestar.com/creator-handle',
    '/',
  ])(
    'rejects a profile link outside the expected instance: %s',
    async (href) => {
      httpGet.mockResolvedValue({
        body: loginPage(embeddedMenu(href)),
        statusCode: 200,
        responseUrl: `${baseUrl}/profile/settings`,
      });

      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
      expect(website.sessionData.profileUrl).toBeUndefined();
    },
  );

  it('does not report unexpected login pages as logged in', async () => {
    const body = '<html><div class="top_bar-user_info"></div></html>';
    httpGet.mockResolvedValue({
      body,
      statusCode: 200,
      responseUrl: `${baseUrl}/profile/settings`,
    });

    await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
  });
});
