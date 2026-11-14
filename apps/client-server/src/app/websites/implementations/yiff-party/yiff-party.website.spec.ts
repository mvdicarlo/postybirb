import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
  DefaultSubmissionFileMetadata,
  PostData,
  SubmissionRating,
  YiffPartyAccountData,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { YiffPartyFileSubmission } from './models/yiff-party-file-submission';
import YiffParty from './yiff-party.website';

describe('YiffParty', () => {
  let website: YiffParty;
  let accountData: YiffPartyAccountData;
  let httpGet: jest.Mock;
  let httpPost: jest.Mock;

  const token = { throwIfAborted: jest.fn() } as unknown as CancellationToken;
  const tags = ['fox', 'male', 'solo', 'species:red_fox', 'meta:digital_art'];

  const me = {
    artist: { name: 'Some Artist', tagSlug: 'some_artist' },
    tag: {
      slug: 'some_artist',
      name: 'some artist',
      url: 'https://yiff-party.com/tag/some_artist/',
    },
    uploadsPending: 0,
    limits: {
      perHour: 20,
      perDay: 100,
      minTags: 5,
      maxFileBytes: 26214400,
      minWidth: 500,
      minHeight: 500,
      fileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    },
  };

  beforeEach(() => {
    accountData = { apiKey: 'yp_test', artistName: 'Some Artist', minTags: 5 };
    httpGet = jest.fn();
    httpPost = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: {
        id: 42,
        status: 'pending',
        url: 'https://yiff-party.com/post/42/',
      },
    });
    website = new YiffParty(
      new Account({ id: 'yiff-party-account', website: 'yiff-party' }),
      {
        app: { getVersion: () => '4.1.5' },
        http: { get: httpGet, post: httpPost },
      } as unknown as PlatformService,
    );
    jest
      .spyOn(website['websiteDataStore'], 'getData')
      .mockImplementation(() => accountData);
  });

  afterEach(() => jest.restoreAllMocks());

  function createFile(width = 1000, height = 1000) {
    return new PostingFile('file', {
      id: 'file',
      submissionFileId: 'file',
      size: 5,
      createdAt: '2026-11-09T00:00:00Z',
      updatedAt: '2026-11-09T00:00:00Z',
      fileName: 'art.png',
      mimeType: 'image/png',
      buffer: Buffer.from('image'),
      width,
      height,
    }).withMetadata({
      ...DefaultSubmissionFileMetadata(),
      altText: 'A fox',
      sourceUrls: ['https://example.com/art', ''],
    });
  }

  function postData(
    overrides: Partial<YiffPartyFileSubmission> = {},
    files: Array<{ width: number; height: number }> = [],
  ): PostData<YiffPartyFileSubmission> {
    return {
      submission: {
        files: files.map((size, index) => ({
          id: `f${index}`,
          fileName: `f${index}.png`,
          metadata: DefaultSubmissionFileMetadata(),
          ...size,
        })),
      },
      options: {
        ...new YiffPartyFileSubmission(),
        title: 'Artwork',
        description: 'Plain text',
        tags,
        rating: SubmissionRating.ADULT,
        ...overrides,
      },
    } as unknown as PostData<YiffPartyFileSubmission>;
  }

  describe('login', () => {
    it('is logged out without an API key', async () => {
      accountData = {};
      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('checks the key against /api/v1/me with a PostyBirb user agent', async () => {
      const setWebsiteData = jest
        .spyOn(website as never, 'setWebsiteData')
        .mockResolvedValue(undefined as never);
      httpGet.mockResolvedValue({ statusCode: 200, body: me });

      await expect(website.onLogin()).resolves.toEqual({
        loggedIn: true,
        username: 'Some Artist',
      });
      expect(httpGet.mock.calls[0][0]).toBe('https://yiff-party.com/api/v1/me/');
      expect(httpGet.mock.calls[0][1].headers).toMatchObject({
        Authorization: 'Bearer yp_test',
        'User-Agent': 'PostyBirb/4.1.5',
      });
      expect(setWebsiteData).toHaveBeenCalledWith({
        apiKey: 'yp_test',
        artistName: 'Some Artist',
        tagSlug: 'some_artist',
        minTags: 5,
      });
    });

    it('is logged out when the key is refused', async () => {
      httpGet.mockResolvedValue({
        statusCode: 403,
        body: { error: 'Key revoked', code: 'forbidden' },
      });
      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    });
  });

  describe('posting', () => {
    it('sends one multipart upload with the mapped fields', async () => {
      const response = await website.onPostFileSubmission(
        postData(),
        [createFile()],
        token,
      );

      expect(httpPost).toHaveBeenCalledTimes(1);
      const [url, request] = httpPost.mock.calls[0];
      expect(url).toBe('https://yiff-party.com/api/v1/uploads/');
      expect(request.type).toBe('multipart');
      expect(request.headers).toMatchObject({
        Authorization: 'Bearer yp_test',
        'User-Agent': 'PostyBirb/4.1.5',
      });
      expect(request.data).toMatchObject({
        title: 'Artwork',
        description: 'Plain text',
        tags: tags.join(','),
        rating: 'ADULT',
        'sourceUrls[0]': 'https://example.com/art',
        'altText[0]': 'A fox',
      });
      expect(request.data['sourceUrls[1]']).toBeUndefined();
      expect(request.data.file).toBeDefined();
      expect(response.sourceUrl).toBe('https://yiff-party.com/post/42/');
      expect(response.exception).toBeUndefined();
    });

    it('reports a duplicate with the existing post', async () => {
      httpPost.mockResolvedValue({
        statusCode: 409,
        body: {
          error: 'Already on Yiff Party',
          code: 'duplicate',
          existing: { id: 7, url: 'https://yiff-party.com/post/7/' },
        },
      });
      const response = await website.onPostFileSubmission(
        postData(),
        [createFile()],
        token,
      );
      expect(response.exception?.message).toBe(
        'Already on Yiff Party: https://yiff-party.com/post/7/',
      );
    });

    it('fails without an API key', async () => {
      accountData = {};
      const response = await website.onPostFileSubmission(
        postData(),
        [createFile()],
        token,
      );
      expect(response.exception?.message).toBe('Not logged in to Yiff Party');
      expect(httpPost).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('accepts a complete submission', async () => {
      const result = await website.onValidateFileSubmission(
        postData({}, [{ width: 800, height: 600 }]),
      );
      expect(result.errors).toEqual([]);
    });

    it('needs the API key, five tags and no artist tag', async () => {
      accountData = {};
      const result = await website.onValidateFileSubmission(
        postData({ tags: ['fox', 'artist:someone_else'] as never }),
      );
      expect(result.errors?.map((error) => error.id)).toEqual([
        'validation.file.yiff-party.not-logged-in',
        'validation.tags.min-tags',
        'validation.tags.yiff-party.artist-tag',
      ]);
    });

    it('refuses images under 500 by 500 pixels', async () => {
      const result = await website.onValidateFileSubmission(
        postData({}, [{ width: 400, height: 900 }]),
      );
      expect(result.errors?.map((error) => error.id)).toEqual([
        'validation.file.yiff-party.min-dimensions',
      ]);
    });
  });
});
