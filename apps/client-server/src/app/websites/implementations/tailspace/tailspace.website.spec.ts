import { Account } from '@postybirb/database';
import { PlatformService } from '@postybirb/platform';
import {
  DefaultSubmissionFileMetadata,
  PostData,
  SubmissionRating,
  TailspaceAccountData,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { TailspaceFileSubmission } from './models/tailspace-file-submission';
import { TailspaceMessageSubmission } from './models/tailspace-message-submission';
import Tailspace from './tailspace.website';

describe('Tailspace', () => {
  let website: Tailspace;
  let accountData: TailspaceAccountData;
  let httpGet: jest.Mock;
  let httpPost: jest.Mock;
  let httpPut: jest.Mock;
  let createResponse: { statusCode: number; body: unknown };

  const token = { throwIfAborted: jest.fn() } as unknown as CancellationToken;

  beforeEach(() => {
    accountData = {
      apiKey: 'tsk_test',
      username: 'artist',
      comics: [
        { value: '', label: 'None (create a post)' },
        { value: '12', label: 'My Comic' },
      ],
    };
    httpGet = jest.fn();
    createResponse = {
      statusCode: 200,
      body: {
        success: true,
        error: null,
        data: { postId: 7, url: 'https://tailspace.com/artist/artist/post/7' },
      },
    };
    httpPost = jest.fn(async (url: string, request: { data: unknown }) => {
      if (url.endsWith('/api/v1/uploads')) {
        const { files } = request.data as { files: { fileName: string }[] };
        return {
          statusCode: 200,
          body: {
            success: true,
            error: null,
            data: {
              uploads: files.map((file) => ({
                uploadId: `id-${file.fileName}`,
                uploadUrl: `https://r2.example/${file.fileName}?signed`,
              })),
            },
          },
        };
      }
      return createResponse;
    });
    httpPut = jest.fn().mockResolvedValue({ statusCode: 200, body: '' });
    website = new Tailspace(
      new Account({ id: 'tailspace-account', website: 'tailspace' }),
      {
        http: { get: httpGet, post: httpPost, put: httpPut },
      } as unknown as PlatformService,
    );
    jest
      .spyOn(website['websiteDataStore'], 'getData')
      .mockImplementation(() => accountData);
  });

  afterEach(() => jest.restoreAllMocks());

  function createFile(id: string) {
    return new PostingFile(id, {
      id,
      submissionFileId: id,
      size: 5,
      createdAt: '2026-10-24T00:00:00Z',
      updatedAt: '2026-10-24T00:00:00Z',
      fileName: `${id}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from('image'),
      width: 1,
      height: 1,
    }).withMetadata(DefaultSubmissionFileMetadata());
  }

  function filePostData(
    overrides: Partial<TailspaceFileSubmission> = {},
  ): PostData<TailspaceFileSubmission> {
    return {
      options: {
        ...new TailspaceFileSubmission(),
        title: 'Artwork',
        description: 'Some **bold** text',
        tags: ['fox', 'digital art'],
        rating: SubmissionRating.MATURE,
        allowComments: true,
        comic: '',
        ...overrides,
      },
    } as unknown as PostData<TailspaceFileSubmission>;
  }

  function sentRequests(path: string) {
    return httpPost.mock.calls
      .filter(([url]) => url === `https://tailspace.com${path}`)
      .map(([, request]) => request);
  }

  function createRequest(path: string) {
    const requests = sentRequests(path);
    expect(requests).toHaveLength(1);
    return requests[0];
  }

  describe('login', () => {
    it('is logged out without an API key', async () => {
      accountData = {};
      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
      expect(httpGet).not.toHaveBeenCalled();
    });

    it('checks the key against /api/v1/me and stores the comics pages can be added to', async () => {
      const setWebsiteData = jest
        .spyOn(website as never, 'setWebsiteData')
        .mockResolvedValue(undefined as never);
      httpGet.mockResolvedValue({
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'artist',
            artistName: 'Artist Name',
            comics: [
              { id: 12, name: 'My Comic', canAddPages: true },
              { id: 13, name: 'Mod-managed Comic', canAddPages: false },
            ],
          },
        },
      });

      await expect(website.onLogin()).resolves.toEqual({
        loggedIn: true,
        username: 'Artist Name',
      });
      expect(httpGet.mock.calls[0][0]).toBe('https://tailspace.com/api/v1/me');
      expect(httpGet.mock.calls[0][1].headers).toMatchObject({
        'X-Api-Key': 'tsk_test',
        'X-Api-Client': 'postybirb-tailspace',
      });
      expect(setWebsiteData).toHaveBeenCalledWith({
        apiKey: 'tsk_test',
        username: 'artist',
        comics: [
          { value: '', label: 'None (create a post)' },
          { value: '12', label: 'My Comic' },
        ],
      });
    });

    it('is logged out when Tailspace rejects the key', async () => {
      httpGet.mockResolvedValue({
        statusCode: 401,
        body: { success: false, error: 'Invalid API key' },
      });
      await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
    });
  });

  describe('posting', () => {
    it('uploads the files, then creates a post with the mapped fields', async () => {
      const response = await website.onPostFileSubmission(
        filePostData(),
        [createFile('one'), createFile('two')],
        token,
      );

      const uploads = createRequest('/api/v1/uploads');
      expect(uploads.type).toBe('json');
      expect(uploads.data).toEqual({
        files: [
          { fileName: 'one.png', fileSize: 5, contentType: 'image/png' },
          { fileName: 'two.png', fileSize: 5, contentType: 'image/png' },
        ],
      });
      expect(httpPut.mock.calls.map(([url]) => url)).toEqual([
        'https://r2.example/one.png?signed',
        'https://r2.example/two.png?signed',
      ]);
      expect(httpPut.mock.calls[0][1]).toEqual({
        type: 'binary',
        data: Buffer.from('image'),
      });

      const post = createRequest('/api/v1/posts');
      expect(post.type).toBe('multipart');
      expect(post.headers['X-Api-Key']).toBe('tsk_test');
      expect(post.data).toEqual({
        title: 'Artwork',
        description: 'Some **bold** text',
        tags: ['fox', 'digital art'],
        rating: 'mature',
        allowComments: 'true',
        uploadId: ['id-one.png', 'id-two.png'],
        fileName: ['one.png', 'two.png'],
      });
      expect(response.sourceUrl).toBe(
        'https://tailspace.com/artist/artist/post/7',
      );
      expect(response.exception).toBeUndefined();
    });

    it.each([
      [SubmissionRating.GENERAL, 'general'],
      [SubmissionRating.MATURE, 'mature'],
      [SubmissionRating.ADULT, 'explicit'],
      [SubmissionRating.EXTREME, 'explicit'],
    ])('maps rating %s to %s', async (rating, expected) => {
      await website.onPostFileSubmission(
        filePostData({ rating }),
        [createFile('one')],
        token,
      );
      expect(createRequest('/api/v1/posts').data.rating).toBe(expected);
    });

    it('adds the files as pages when a comic is picked', async () => {
      createResponse = {
        statusCode: 200,
        body: {
          success: true,
          error: null,
          data: {
            comicId: 12,
            pagesAdded: 2,
            url: 'https://tailspace.com/c/my-comic',
          },
        },
      };
      const response = await website.onPostFileSubmission(
        filePostData({ comic: '12' }),
        [createFile('one'), createFile('two')],
        token,
      );

      expect(createRequest('/api/v1/comics/12/pages').data).toEqual({
        uploadId: ['id-one.png', 'id-two.png'],
        fileName: ['one.png', 'two.png'],
      });
      expect(sentRequests('/api/v1/posts')).toHaveLength(0);
      expect(response.sourceUrl).toBe('https://tailspace.com/c/my-comic');
    });

    it("reports Tailspace's error message when creating fails", async () => {
      createResponse = {
        statusCode: 400,
        body: { success: false, error: 'A post must have a title' },
      };
      const response = await website.onPostFileSubmission(
        filePostData(),
        [createFile('one')],
        token,
      );
      expect(response.exception?.message).toBe('A post must have a title');
    });

    it('fails with the server message when uploads are refused', async () => {
      httpPost.mockResolvedValueOnce({
        statusCode: 400,
        body: { success: false, error: 'one.png is too large (max 50MB)' },
      });
      await expect(
        website.onPostFileSubmission(
          filePostData(),
          [createFile('one')],
          token,
        ),
      ).rejects.toThrow('one.png is too large (max 50MB)');
      expect(httpPut).not.toHaveBeenCalled();
      expect(sentRequests('/api/v1/posts')).toHaveLength(0);
    });

    it('does not create the post when a file upload fails', async () => {
      httpPut.mockResolvedValueOnce({ statusCode: 403, body: '' });
      await expect(
        website.onPostFileSubmission(
          filePostData(),
          [createFile('one')],
          token,
        ),
      ).rejects.toThrow(
        'Uploading one.png to Tailspace failed with status 403',
      );
      expect(sentRequests('/api/v1/posts')).toHaveLength(0);
    });

    it('sends text posts without uploading anything', async () => {
      const postData = {
        options: {
          ...new TailspaceMessageSubmission(),
          title: 'News',
          description: 'Hello',
          tags: [],
          rating: SubmissionRating.GENERAL,
          allowComments: false,
        },
      } as unknown as PostData<TailspaceMessageSubmission>;

      await website.onPostMessageSubmission(postData, token);

      expect(sentRequests('/api/v1/uploads')).toHaveLength(0);
      expect(httpPut).not.toHaveBeenCalled();
      expect(createRequest('/api/v1/posts').data).toEqual({
        title: 'News',
        description: 'Hello',
        tags: [],
        rating: 'general',
        allowComments: 'false',
      });
    });
  });

  describe('validation', () => {
    it('requires a title for posts', async () => {
      const result = await website.onValidateFileSubmission(
        filePostData({ title: '' }),
      );
      expect(result.errors).toEqual([
        { id: 'validation.field.required', values: {}, field: 'title' },
      ]);
    });

    it('warns that post fields are unused when a comic is picked', async () => {
      const result = await website.onValidateFileSubmission(
        filePostData({ title: '', comic: '12' }),
      );
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([
        {
          id: 'validation.file.tailspace.comic-ignores-post-fields',
          values: {},
          field: 'comic',
        },
      ]);
    });

    it('rejects a comic that is no longer in the account', async () => {
      const result = await website.onValidateFileSubmission(
        filePostData({ comic: '99' }),
      );
      expect(result.errors).toEqual([
        {
          id: 'validation.file.tailspace.comic-unavailable',
          values: {},
          field: 'comic',
        },
      ]);
    });
  });
});
