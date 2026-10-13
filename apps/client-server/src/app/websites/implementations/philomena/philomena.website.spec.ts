import { Account } from '@postybirb/database';
import { FormFile } from '@postybirb/http/types';
import { PlatformService } from '@postybirb/platform';
import { IFileBuffer, PostData, SubmissionRating } from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import Derpibooru from '../derpibooru/derpibooru.website';
import { DerpibooruFileSubmission } from '../derpibooru/models/derpibooru-file-submission';

const SIGNED_IN_HTML =
  '<div data-user-is-signed-in="true" data-user-name="tester"></div>';
const SIGNED_OUT_HTML = '<div data-user-is-signed-in="false"></div>';
const LOGOUT_HEADER =
  '<header><a href="/sessions" data-method="delete">Sign out</a></header>';

function createWebsite(body: unknown, statusCode = 200) {
  const get = jest.fn().mockResolvedValue({ body, statusCode });
  const post = jest.fn();
  const platform = {
    http: { get, post },
    session: { getCookies: jest.fn().mockResolvedValue([]) },
  } as unknown as PlatformService;
  const account = new Account({
    id: 'account-1',
    name: 'Derpibooru',
    website: 'derpibooru',
  });

  return { get, post, website: new Derpibooru(account, platform) };
}

function createFile(): PostingFile {
  return new PostingFile('file-1', {
    id: 'buffer-1',
    buffer: Buffer.from('image'),
    fileName: 'image.png',
    height: 1,
    mimeType: 'image/png',
    width: 1,
  } as IFileBuffer).withMetadata({
    dimensions: {},
    ignoredWebsites: [],
    sourceUrls: ['https://example.com/source'],
  });
}

const postData = {
  options: {
    description: 'Description',
    rating: SubmissionRating.GENERAL,
    tags: ['artist:test', 'solo', 'portrait'],
  },
} as unknown as PostData<DerpibooruFileSubmission>;

const uploadForm = `
  <main id="content">
    <form action="/images" method="post">
      <input name="_csrf_token" type="hidden" value="csrf-token">
      <input name="image[anonymous]" type="hidden" value="false">
      <input name="image[anonymous]" type="checkbox" value="true" checked>
    </form>
  </main>
`;

function httpResponse(body: string, responseUrl: string) {
  return {
    body,
    responseUrl,
    statusCode: 200,
    statusMessage: 'OK',
  };
}

describe('Philomena login detection', () => {
  it('uses the structured indicator without requiring a Logout label', async () => {
    const { get, website } = createWebsite(SIGNED_IN_HTML);

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true,
      username: 'tester',
    });
    expect(get).toHaveBeenCalledWith('https://derpibooru.org', {
      partition: 'account-1',
    });
  });

  describe('Philomena image posting', () => {
    it('posts the browser form fields required by Philomena', async () => {
      const { post, website } = createWebsite(uploadForm);
      post.mockResolvedValue(
        httpResponse(
          '<html><h1>Image #123</h1></html>',
          'https://derpibooru.org/images/123',
        ),
      );

      const response = await website.onPostFileSubmission(
        postData,
        [createFile()],
        new CancellationToken(),
      );

      expect(response).toMatchObject({
        sourceUrl: 'https://derpibooru.org/images/123',
      });
      expect(response.exception).toBeUndefined();
      expect(post).toHaveBeenCalledWith('https://derpibooru.org/images', {
        partition: 'account-1',
        type: 'multipart',
        data: {
          _csrf_token: 'csrf-token',
          _method: 'post',
          'image[anonymous]': 'false',
          'image[tag_input]': 'artist:test, solo, portrait, safe',
          'image[image]': expect.any(FormFile),
          'image[description]': 'Description',
          'image[sources][0][source]': 'https://example.com/source',
        },
        headers: {},
        options: {},
        uploadAsRawData: false,
      });
    });

    it('returns Philomena form validation errors instead of reporting success', async () => {
      const { post, website } = createWebsite(uploadForm);
      post.mockResolvedValue(
        httpResponse(
          '<main id="content"><span class="help-block">Tag input should have at least 3 tags</span></main>',
          'https://derpibooru.org/images',
        ),
      );

      const response = await website.onPostFileSubmission(
        postData,
        [createFile()],
        new CancellationToken(),
      );

      expect(response.exception?.message).toBe(
        'Tag input should have at least 3 tags',
      );
      expect(response.sourceUrl).toBeUndefined();
    });

    it('returns duplicate upload errors from Philomena', async () => {
      const { post, website } = createWebsite(uploadForm);
      post.mockResolvedValue(
        httpResponse(
          `<span class="help-block">Image has already been uploaded: it's image 123</span>`,
          'https://derpibooru.org/images',
        ),
      );

      const response = await website.onPostFileSubmission(
        postData,
        [createFile()],
        new CancellationToken(),
      );

      expect(response.exception?.message).toBe(
        "Image has already been uploaded: it's image 123",
      );
    });

    it('defers posting when Philomena returns its upload rate limit', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const { post, website } = createWebsite(uploadForm);
      post.mockResolvedValue(
        httpResponse(
          '<div class="flash flash--warning">You may only upload images once every 3 seconds.</div>',
          'https://derpibooru.org/images/new',
        ),
      );

      const response = await website.onPostFileSubmission(
        postData,
        [createFile()],
        new CancellationToken(),
      );

      expect(response).toMatchObject({
        message: 'You may only upload images once every 3 seconds.',
        rateLimitedUntil: new Date(1_003_000).toISOString(),
      });
      expect(response.exception).toBeUndefined();
      jest.restoreAllMocks();
    });

    it('rejects an unconfirmed upload response', async () => {
      const { post, website } = createWebsite(uploadForm);
      post.mockResolvedValue(
        httpResponse(
          '<html><title>Sign in</title></html>',
          'https://derpibooru.org/sessions/new',
        ),
      );

      const response = await website.onPostFileSubmission(
        postData,
        [createFile()],
        new CancellationToken(),
      );

      expect(response.exception?.message).toBe(
        'Philomena did not confirm that the image was created. You may need to sign in again.',
      );
    });

    it('does not post when the upload form is missing', async () => {
      const { post, website } = createWebsite(
        '<html><title>Just a moment...</title></html>',
      );

      await expect(
        website.onPostFileSubmission(
          postData,
          [createFile()],
          new CancellationToken(),
        ),
      ).rejects.toThrow('Unable to load the upload form');
      expect(post).not.toHaveBeenCalled();
    });
  });

  it('extracts the username from the session element, not unrelated content', async () => {
    const { website } = createWebsite(
      '<div data-user-name="unrelated"></div>' + SIGNED_IN_HTML,
    );

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true,
      username: 'tester',
    });
  });

  it('accepts an explicit signed-in indicator without a username', async () => {
    const { website } = createWebsite(
      '<div data-user-is-signed-in="true"></div>',
    );

    await expect(website.onLogin()).resolves.toEqual({
      loggedIn: true,
      username: 'Unknown',
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
      loggedIn: true,
      username: 'tester',
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

    await expect(website.onLogin()).rejects.toThrow(
      'Unable to determine login state',
    );
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
  ])(
    'preserves the previous login state on an indeterminate check: %j',
    async (response) => {
      const { get, website } = createWebsite(SIGNED_IN_HTML);
      const previous = await website.login();
      expect(previous).toMatchObject({ isLoggedIn: true, username: 'tester' });
      get.mockResolvedValue(response);

      await expect(website.login()).resolves.toEqual(previous);
    },
  );

  it('updates the previous login state when explicitly signed out', async () => {
    const { get, website } = createWebsite(SIGNED_IN_HTML);
    await website.login();
    get.mockResolvedValue({ statusCode: 200, body: SIGNED_OUT_HTML });

    await expect(website.login()).resolves.toMatchObject({ isLoggedIn: false });
  });
});
