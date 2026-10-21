import { Test, TestingModule } from '@nestjs/testing';
import {
  Account,
  Submission,
  SubmissionFile,
  WebsiteOptions,
} from '@postybirb/database';
import {
  BinaryPostOptions,
  FormFile,
  HttpResponse,
  PostOptions,
} from '@postybirb/http/types';
import { PlatformService } from '@postybirb/platform';
import {
  Adore34AccountData,
  DefaultDescriptionValue,
  DefaultSubmissionFileMetadata,
  DefaultTagValue,
  FileType,
  PostData,
  SubmissionType,
} from '@postybirb/types';
import {
  getFileType,
  getFileTypeFromMimeType,
} from '@postybirb/utils/file-type';
import { createHash } from 'crypto';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { FileService } from '../../../file/file.service';
import { NoopPlatformService } from '../../../platform/testing/noop-platform-providers';
import { TitleParser } from '../../../post-parsers/parsers/title-parser';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { CancellationToken } from '../../../posting/cancellation-token';
import {
  PostingFile,
  ThumbnailOptions,
} from '../../../posting/models/posting-file';
import { ValidationService } from '../../../validation/validation.service';
import { getSupportedFileSize } from '../../decorators/supports-files.decorator';
import { DefaultWebsiteOptions } from '../../models/default-website-options';
import { WebsiteRegistryService } from '../../website-registry.service';
import Adore34 from './adore34.website';
import { Adore34FileSubmission } from './models/adore34-file-submission';
import { Adore34MessageSubmission } from './models/adore34-message-submission';

const baseUrl = 'https://api.adore34.com';
const apiKey = 'adore_ak_test-key';
const postId = '665f00000000000000000001';
const tierId = '665f00000000000000000002';
const fileId = (index: number) => index.toString(16).padStart(24, '0');

function response<T>(body: T, statusCode = 200): HttpResponse<T> {
  return { body, statusCode, statusMessage: 'Test', responseUrl: '' };
}

function createFile(
  id = 'artwork',
  mimeType = 'image/png',
  buffer = Buffer.from('artwork'),
  thumbnail?: ThumbnailOptions,
): PostingFile {
  return new PostingFile(
    id,
    {
      id,
      submissionFileId: id,
      fileName: `${id}.png`,
      mimeType,
      buffer,
      size: buffer.length,
      width: 1,
      height: 1,
      createdAt: '2026-10-20T00:00:00Z',
      updatedAt: '2026-10-20T00:00:00Z',
    },
    thumbnail,
  ).withMetadata(DefaultSubmissionFileMetadata());
}

function thumbnail(): ThumbnailOptions {
  return {
    fileName: 'preview.png',
    mimeType: 'image/png',
    buffer: Buffer.from('preview'),
    width: 1,
    height: 1,
  };
}

function toSubmissionFile(file: PostingFile): SubmissionFile {
  return new SubmissionFile({
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.buffer.length,
    hasThumbnail: Boolean(file.thumbnail),
    metadata: DefaultSubmissionFileMetadata(),
  });
}

describe('Adore34', () => {
  let website: Adore34;
  let accountData: Adore34AccountData;
  let postData: PostData<Adore34FileSubmission>;
  let cancellation: CancellationToken;
  let get: jest.SpyInstance;
  let post: jest.SpyInstance<
    Promise<HttpResponse<unknown>>,
    [string, PostOptions | BinaryPostOptions]
  >;
  let put: jest.SpyInstance<
    Promise<HttpResponse<unknown>>,
    [string, PostOptions | BinaryPostOptions]
  >;
  let fetch: jest.SpyInstance;
  let save: jest.SpyInstance;
  let validationModule: TestingModule | undefined;

  beforeEach(() => {
    accountData = { apiKey };
    const platform: PlatformService = new NoopPlatformService();
    get = jest.spyOn(platform.http, 'get').mockResolvedValue(response([]));
    fetch = jest
      .spyOn(platform.network, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    let uploadIndex = 0;
    let completedIndex = 0;
    const uploads = new Map<string, number>();
    post = jest
      .spyOn(platform.http, 'post')
      .mockImplementation(async (url, options) => {
        if (url.endsWith('/upload/init') && options.type === 'json') {
          const totalSize = options.data.totalSize;
          if (typeof totalSize !== 'number')
            throw new Error('Missing upload size');
          uploadIndex++;
          const uploadId = `upload-${uploadIndex}`;
          const chunkSize = 5 * 1024 ** 2;
          const totalChunks = Math.ceil(totalSize / chunkSize);
          uploads.set(uploadId, totalChunks);
          return response({ uploadId, chunkSize, totalChunks });
        }
        if (url.endsWith('/complete')) {
          completedIndex++;
          return response({ fileId: fileId(completedIndex) });
        }
        if (url.endsWith('/posts/creators')) {
          return response({ status: 200, data: { _id: postId } });
        }
        throw new Error(`Unexpected POST ${url}`);
      });
    put = jest.spyOn(platform.http, 'put').mockImplementation(async (url) => {
      const match = /\/upload\/([^/]+)\/chunk\/(\d+)$/.exec(url);
      if (!match || !uploads.has(match[1])) {
        throw new Error(`Unexpected PUT ${url}`);
      }
      return response({
        received: Number(match[2]) + 1,
        total: uploads.get(match[1]),
      });
    });
    website = new Adore34(
      new Account({
        id: 'adore34-account',
        website: 'adore34',
        name: 'My creator account',
      }),
      platform,
    );
    jest
      .spyOn(website['websiteDataStore'], 'getData')
      .mockImplementation(() => ({ ...accountData }));
    save = jest
      .spyOn(website, 'setWebsiteData')
      .mockImplementation(async (data) => {
        accountData = data;
      });
    jest.spyOn(website['logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(website['logger'], 'warn').mockImplementation(() => undefined);
    jest
      .spyOn(website['logger'], 'withError')
      .mockReturnValue(website['logger']);
    cancellation = new CancellationToken();
    const submission = new Submission({ type: SubmissionType.FILE });
    submission.files = [];
    postData = {
      options: Object.assign(new Adore34FileSubmission(), {
        title: 'Artwork',
        description: 'Plain text caption',
        tags: ['art', 'example'],
      }),
      submission,
    };
  });

  afterEach(async () => {
    await validationModule?.close();
    validationModule = undefined;
    await website.dispose();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function createPayload(): Record<string, unknown> {
    const request = post.mock.calls.find(([url]) =>
      url.endsWith('/posts/creators'),
    );
    if (!request || request[1].type !== 'json') {
      throw new Error('No JSON create request was sent');
    }
    return request[1].data;
  }

  async function validateSubmission(type = SubmissionType.FILE) {
    const submission = new Submission({ type });
    submission.files = postData.submission.files.map(
      (file) => new SubmissionFile(file),
    );
    const websiteOptions = new WebsiteOptions({
      accountId: website.accountId,
      data: Object.assign(new Adore34FileSubmission(), {
        ...postData.options,
        description: DefaultDescriptionValue(),
        tags: DefaultTagValue(),
      }),
    });
    websiteOptions.account = website.account;
    submission.options = [
      new WebsiteOptions({
        isDefault: true,
        data: new DefaultWebsiteOptions(),
      }),
      websiteOptions,
    ];
    postData.submission = submission;

    if (!validationModule) {
      validationModule = await Test.createTestingModule({
        providers: [
          ValidationService,
          {
            provide: WebsiteRegistryService,
            useValue: { findInstance: jest.fn().mockReturnValue(website) },
          },
          {
            provide: PostParsersService,
            useValue: {
              parse: jest.fn().mockImplementation(async () => postData),
            },
          },
          {
            provide: FileConverterService,
            useValue: { canConvert: jest.fn().mockResolvedValue(false) },
          },
          {
            provide: FileService,
            useValue: { getAltFileSize: jest.fn().mockResolvedValue(0) },
          },
        ],
      }).compile();
    }
    return validationModule
      .get(ValidationService)
      .validate(submission, websiteOptions);
  }

  describe('registration and options', () => {
    it('advertises supported media without accepting unknown file categories', () => {
      expect(website.decoratedProps.metadata).toMatchObject({
        name: 'adore34',
        displayName: 'Adore34',
      });
      expect(website.decoratedProps.loginFlow).toEqual({
        type: 'custom',
        loginComponentName: 'Adore34',
      });
      expect(website.supportsFile).toBe(true);
      expect(website.supportsMessage).toBe(true);
      expect(website.decoratedProps.fileOptions?.fileBatchSize).toBe(16);
      expect(website.decoratedProps.fileOptions?.supportedFileTypes).toEqual(
        expect.arrayContaining([
          FileType.IMAGE,
          FileType.VIDEO,
          FileType.AUDIO,
          FileType.TEXT,
        ]),
      );
      expect(
        website.decoratedProps.fileOptions?.supportedFileTypes,
      ).not.toContain(FileType.UNKNOWN);
      expect(getFileType('comic.epub')).toBe(FileType.TEXT);
      expect(getFileTypeFromMimeType('video/mov')).toBe(FileType.VIDEO);
    });

    it.each([Adore34FileSubmission, Adore34MessageSubmission])(
      'sets safe visibility, caption limits, and no unsupported rating for %p',
      (Model) => {
        const model = new Model();
        expect(model.visibility).toBe('subscribers');
        expect(model.isPurchasable).toBe(false);
        expect(model.getFormFieldFor('title')).toMatchObject({
          required: true,
          minLength: 1,
          maxLength: 150,
        });
        expect(model.getFormFieldFor('description')).toMatchObject({
          required: false,
          maxDescriptionLength: 1500,
          descriptionType: 'plaintext',
        });
        expect(model.getFormFieldFor('rating')).toMatchObject({
          hidden: true,
          required: false,
        });
      },
    );

    it('derives tier choices and keeps preview options out of text-only forms', () => {
      const fields = new Adore34FileSubmission().getFormFields({
        tiers: [{ value: tierId, label: 'Supporters' }],
      });
      expect(fields.tiers).toMatchObject({
        options: [{ value: tierId, label: 'Supporters' }],
        allowMultiple: true,
        showWhen: [['visibility', ['tiers']]],
      });
      expect(new Adore34MessageSubmission().getFormFields()).not.toHaveProperty(
        'useThumbnailAsPreview',
      );
    });

    it.each(['all', 'subscribers', 'tiers'] as const)(
      'requires tier selection only for tier-restricted visibility (%s)',
      (visibility) => {
        const model = new Adore34MessageSubmission();
        model.visibility = visibility;
        expect(model.getFormFields().tiers).toMatchObject({
          required: visibility === 'tiers',
          minSelected: visibility === 'tiers' ? 1 : 0,
        });
      },
    );

    it.each([
      ['image/png', 25 * 1024 ** 2],
      ['video/mp4', 6 * 1024 ** 3],
      ['audio/mpeg', 15 * 1024 ** 2],
      ['application/pdf', 500 * 1024 ** 2],
      ['application/epub+zip', 500 * 1024 ** 2],
    ] as const)('declares the exact %s size limit', (mimeType, maxSize) => {
      expect(
        getSupportedFileSize(website, new SubmissionFile({ mimeType })),
      ).toBe(maxSize);
    });
  });

  describe('authentication', () => {
    it('accepts a valid key even when the creator has no tiers', async () => {
      await expect(website.onLogin()).resolves.toEqual({
        loggedIn: true,
        username: 'My creator account',
      });
      expect(get).toHaveBeenCalledWith(`${baseUrl}/creator-tiers`, {
        partition: website.accountId,
        headers: { Authorization: apiKey, Accept: 'application/json' },
        queryParameters: { limit: 200, offset: 0 },
      });
      expect(website.getWebsiteData()).toEqual({ tiers: [] });
    });

    it.each([undefined, '', 'session.jwt.token', 'adore_ak_'])(
      'rejects missing keys or session tokens (%s)',
      async (invalidKey) => {
        Object.assign(accountData, { apiKey: invalidKey });
        await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
        expect(get).not.toHaveBeenCalled();
      },
    );

    it('paginates raw tier arrays and excludes hidden and archived tiers', async () => {
      const page = Array.from({ length: 200 }, (_, index) => ({
        _id: fileId(index + 1),
        name: `Tier ${index + 1}`,
      }));
      get.mockResolvedValueOnce(response(page)).mockResolvedValueOnce(
        response([
          { _id: fileId(201), name: 'Hidden', access: { isHidden: true } },
          { _id: fileId(202), name: 'Archived', access: { isArchived: true } },
          { _id: fileId(203), name: 'Archived date', archivedAt: '2026-10-20' },
          { _id: fileId(204), name: 'Supporters' },
        ]),
      );
      await expect(website.onLogin()).resolves.toMatchObject({
        loggedIn: true,
      });
      expect(get.mock.calls[1][1].queryParameters).toEqual({
        limit: 200,
        offset: 200,
      });
      expect(accountData.tiers).toHaveLength(201);
      expect(accountData.tiers?.at(-1)).toEqual({
        value: fileId(204),
        label: 'Supporters',
      });
    });

    it.each([401, 403])(
      'does not authenticate HTTP %s responses',
      async (status) => {
        get.mockResolvedValue(
          response({ message: 'Invalid key or scope' }, status),
        );
        await expect(website.onLogin()).resolves.toEqual({ loggedIn: false });
        expect(save).not.toHaveBeenCalled();
      },
    );

    it.each([{}, { data: [] }, [null], [{ _id: tierId }]])(
      'rejects malformed tier responses (%j)',
      async (body) => {
        get.mockResolvedValue(response(body));
        await expect(website.onLogin()).rejects.toMatchObject({
          exception: expect.any(Error),
        });
        expect(save).not.toHaveBeenCalled();
      },
    );

    it('does not turn network failures into a logged-out result', async () => {
      get.mockRejectedValue(new Error('Connection reset'));
      await expect(website.onLogin()).rejects.toThrow('Connection reset');
      expect(save).not.toHaveBeenCalled();
    });

    it('trims and validates a replacement key before saving it', async () => {
      await expect(
        website.onAuthRoute.login({ apiKey: `  ${apiKey}  ` }),
      ).resolves.toEqual({ result: true });
      expect(accountData.apiKey).toBe(apiKey);
      expect(website.getWebsiteData()).not.toHaveProperty('apiKey');

      save.mockClear();
      get.mockResolvedValue(response({}, 401));
      await expect(
        website.onAuthRoute.login({ apiKey: 'adore_ak_invalid' }),
      ).resolves.toEqual({ result: false });
      expect(save).not.toHaveBeenCalled();
      expect(accountData.apiKey).toBe(apiKey);
    });
  });

  describe('publishing', () => {
    it('initializes, uploads, completes, then creates a post with raw authentication', async () => {
      const file = createFile();
      const result = await website.onPostFileSubmission(
        postData,
        [file],
        cancellation,
      );
      expect(result.exception).toBeUndefined();
      expect(result.additionalInfo).toEqual({ _id: postId });
      expect(post.mock.calls.map(([url]) => url)).toEqual([
        `${baseUrl}/upload/init`,
        `${baseUrl}/upload/upload-1/complete`,
        `${baseUrl}/posts/creators`,
      ]);
      expect(post.mock.calls[0][1]).toMatchObject({
        type: 'json',
        data: {
          fileName: file.fileName,
          mimeType: 'image/png',
          totalSize: file.buffer.length,
          fieldName: 'images',
          uploadContext: 'post',
        },
      });
      [...post.mock.calls, ...put.mock.calls].forEach(([, options]) => {
        expect(options.partition).toBe(website.accountId);
        expect(options.headers).toEqual({
          Authorization: apiKey,
          Accept: 'application/json',
        });
      });
      expect(createPayload()).toEqual({
        title: 'Artwork',
        text: 'Plain text caption',
        tags: ['art', 'example'],
        scope: { type: 'subscribers', isPurchasable: false, price: 0 },
        flags: {
          commentsEnabled: true,
          notifyFansOnPublish: true,
          inspiredBySaga: false,
        },
        imageIds: [fileId(1)],
        videoIds: [],
        audioIds: [],
        comicIds: [],
        previewImageIds: [],
        fileIds: [],
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('uses server-provided chunk sizes, zero-based indices, and exact SHA-256 hashes', async () => {
      post.mockResolvedValueOnce(
        response({ uploadId: 'sliced', chunkSize: 3, totalChunks: 3 }),
      );
      put
        .mockResolvedValueOnce(response({ received: 1, total: 3 }))
        .mockResolvedValueOnce(response({ received: 2, total: 3 }))
        .mockResolvedValueOnce(response({ received: 3, total: 3 }));
      const result = await website.onPostFileSubmission(
        postData,
        [createFile('sliced', 'image/png', Buffer.from('abcdefgh'))],
        cancellation,
      );
      expect(result.exception).toBeUndefined();
      expect(put.mock.calls.map(([url]) => url)).toEqual(
        [0, 1, 2].map((index) => `${baseUrl}/upload/sliced/chunk/${index}`),
      );
      put.mock.calls.forEach(([, options], index) => {
        if (options.type !== 'multipart')
          throw new Error('Expected multipart chunk');
        const part = options.data.chunk;
        if (!(part instanceof FormFile)) throw new Error('Expected chunk file');
        const expected = ['abc', 'def', 'gh'][index];
        expect(part.buffer.toString()).toBe(expected);
        expect(options.data.chunkHash).toBe(
          createHash('sha256').update(expected).digest('hex'),
        );
      });
    });

    it.each([
      ['image/avif', 'images', 'imageIds'],
      ['video/quicktime', 'videos', 'videoIds'],
      ['audio/mpeg', 'audio', 'audioIds'],
      ['application/pdf', 'comics', 'comicIds'],
      ['application/epub+zip', 'comics', 'comicIds'],
    ])(
      'routes %s to its upload and post fields',
      async (mimeType, fieldName, idField) => {
        const result = await website.onPostFileSubmission(
          postData,
          [createFile('media', mimeType)],
          cancellation,
        );
        expect(result.exception).toBeUndefined();
        expect(post.mock.calls[0][1]).toMatchObject({ data: { fieldName } });
        expect(createPayload()[idField]).toEqual([fileId(1)]);
      },
    );

    it('supports the maximum combined image, video, and audio counts', async () => {
      const files = [
        ...Array.from({ length: 10 }, (_, index) =>
          createFile(`image-${index}`),
        ),
        ...Array.from({ length: 5 }, (_, index) =>
          createFile(`video-${index}`, 'video/mp4'),
        ),
        createFile('audio', 'audio/wav'),
      ];
      const result = await website.onPostFileSubmission(
        postData,
        files,
        cancellation,
      );
      expect(result.exception).toBeUndefined();
      expect(createPayload().imageIds).toHaveLength(10);
      expect(createPayload().videoIds).toHaveLength(5);
      expect(createPayload().audioIds).toHaveLength(1);
    });

    it('supports text-only public posts without uploads', async () => {
      postData.options.visibility = 'all';
      const result = await website.onPostMessageSubmission(
        postData,
        cancellation,
      );
      expect(result.exception).toBeUndefined();
      expect(post).toHaveBeenCalledTimes(1);
      expect(createPayload()).toMatchObject({
        scope: { type: 'all', isPurchasable: false, price: 0 },
        imageIds: [],
        videoIds: [],
        audioIds: [],
        comicIds: [],
        previewImageIds: [],
      });
      expect(put).not.toHaveBeenCalled();
    });

    it.each([3, 300])(
      'supports tier-specific purchases at %s credits',
      async (price) => {
        Object.assign(postData.options, {
          visibility: 'tiers',
          tiers: [tierId],
          isPurchasable: true,
          price,
          commentsEnabled: false,
          notifyFansOnPublish: false,
          inspiredBySaga: true,
        });
        const result = await website.onPostMessageSubmission(
          postData,
          cancellation,
        );
        expect(result.exception).toBeUndefined();
        expect(createPayload()).toMatchObject({
          scope: {
            type: 'tiers',
            tierIds: [tierId],
            isPurchasable: true,
            price,
          },
          flags: {
            commentsEnabled: false,
            notifyFansOnPublish: false,
            inspiredBySaga: true,
          },
        });
      },
    );

    it('uploads comic previews separately from exclusive comic media', async () => {
      postData.options.useThumbnailAsPreview = true;
      const result = await website.onPostFileSubmission(
        postData,
        [createFile('comic', 'application/pdf', undefined, thumbnail())],
        cancellation,
      );
      expect(result.exception).toBeUndefined();
      expect(createPayload()).toMatchObject({
        comicIds: [fileId(1)],
        previewImageIds: [fileId(2)],
        imageIds: [],
      });
      expect(post.mock.calls[2][1]).toMatchObject({
        data: { fieldName: 'images', uploadContext: 'post' },
      });
    });

    it('never exposes thumbnails unless previews are explicitly enabled', async () => {
      await website.onPostFileSubmission(
        postData,
        [createFile('image', 'image/png', undefined, thumbnail())],
        cancellation,
      );
      expect(createPayload().previewImageIds).toEqual([]);
      expect(post).toHaveBeenCalledTimes(3);
    });
  });

  describe('validation', () => {
    it.each([
      [{ title: '' }, 'title', 'validation.title.min-length'],
      [{ visibility: '' }, 'visibility', 'validation.field.required'],
      [
        { visibility: 'public' },
        'visibility',
        'validation.select-field.invalid-option',
      ],
      [
        { visibility: 'tiers', tiers: [] },
        'tiers',
        'validation.select-field.min-selected',
      ],
    ] as const)(
      'uses shared field validation for %j',
      async (options, field, id) => {
        Object.assign(postData.options, options);
        const validation = await validateSubmission();
        expect(validation.errors).toEqual([
          expect.objectContaining({ id, field }),
        ]);
        expect(
          (await website.onValidateFileSubmission(postData)).errors,
        ).toEqual([]);
        expect(post).not.toHaveBeenCalled();
      },
    );

    it.each([
      { visibility: 'tiers', tiers: ['invalid-id'] },
      { visibility: 'all', isPurchasable: true },
      { visibility: 'all', useThumbnailAsPreview: true },
      { isPurchasable: true, price: 2.99 },
      { isPurchasable: true, price: 300.01 },
      { isPurchasable: true, price: NaN },
      { isPurchasable: true, price: Infinity },
    ])(
      'rejects site-specific options during preflight (%j)',
      async (options) => {
        Object.assign(postData.options, options);
        const validation = await validateSubmission();
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(post).not.toHaveBeenCalled();
      },
    );

    it('uses the shared parser to truncate titles to 150 characters', async () => {
      const model = new Adore34MessageSubmission();
      model.title = 'a'.repeat(151);
      postData.options.title = await new TitleParser().parse(
        new DefaultWebsiteOptions(),
        model,
      );
      expect(postData.options.title).toBe('a'.repeat(150));
      expect((await validateSubmission(SubmissionType.MESSAGE)).errors).toEqual(
        [],
      );
      expect(
        (await website.onPostMessageSubmission(postData, cancellation))
          .exception,
      ).toBeUndefined();
      expect(createPayload().title).toBe('a'.repeat(150));
    });

    it('uses shared caption length warnings instead of duplicate errors', async () => {
      postData.options.description = 'a'.repeat(1501);
      const validation = await validateSubmission(SubmissionType.MESSAGE);
      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toContainEqual({
        id: 'validation.description.max-length',
        field: 'description',
        values: { currentLength: 1501, maxLength: 1500 },
      });
    });

    it('accepts the exact title and caption limits', async () => {
      Object.assign(postData.options, {
        title: 'a'.repeat(150),
        description: 'b'.repeat(1500),
      });
      expect((await validateSubmission(SubmissionType.MESSAGE)).errors).toEqual(
        [],
      );
      expect(
        (await website.onPostMessageSubmission(postData, cancellation))
          .exception,
      ).toBeUndefined();
    });

    it.each([3, 300])(
      'accepts a purchase price of %s credits',
      async (price) => {
        Object.assign(postData.options, { isPurchasable: true, price });
        expect(
          (await validateSubmission(SubmissionType.MESSAGE)).errors,
        ).toEqual([]);
        expect(
          (await website.onPostMessageSubmission(postData, cancellation))
            .exception,
        ).toBeUndefined();
        expect(createPayload().scope).toMatchObject({ price });
      },
    );

    it.each([
      ['image/png', 11],
      ['video/mp4', 6],
      ['audio/wav', 2],
      ['application/pdf', 2],
    ] as const)('rejects too many %s files (%s)', async (mimeType, count) => {
      const files = Array.from({ length: count }, (_, index) =>
        createFile(`media-${index}`, mimeType),
      );
      postData.submission.files = files.map(toSubmissionFile);
      expect((await validateSubmission()).errors).toHaveLength(1);
      expect(post).not.toHaveBeenCalled();
    });

    it.each(['image/png', 'video/mp4', 'audio/wav'])(
      'rejects a comic combined with %s',
      async (mimeType) => {
        postData.submission.files = [
          createFile('comic', 'application/pdf'),
          createFile('other', mimeType),
        ].map(toSubmissionFile);
        expect((await validateSubmission()).errors).toHaveLength(1);
        expect(post).not.toHaveBeenCalled();
      },
    );

    it('counts only files selected for this account during validation', async () => {
      postData.submission.files = Array.from(
        { length: 11 },
        (_, index) =>
          new SubmissionFile({
            id: `image-${index}`,
            mimeType: 'image/png',
            metadata: {
              ...DefaultSubmissionFileMetadata(),
              ignoredWebsites: index === 10 ? [website.accountId] : [],
            },
          }),
      );
      expect((await website.onValidateFileSubmission(postData)).errors).toEqual(
        [],
      );
      postData.submission.files[10].metadata.ignoredWebsites = [];
      expect(
        (await website.onValidateFileSubmission(postData)).errors,
      ).toHaveLength(1);
    });

    it.each([5, 6])(
      'enforces the five-preview limit (%s previews)',
      async (count) => {
        postData.options.useThumbnailAsPreview = true;
        const files = Array.from({ length: count }, (_, index) =>
          createFile(`image-${index}`, 'image/png', undefined, thumbnail()),
        );
        postData.submission.files = files.map(toSubmissionFile);
        const validation = await validateSubmission();
        if (count === 5) {
          expect(validation.errors).toEqual([]);
          const result = await website.onPostFileSubmission(
            postData,
            files,
            cancellation,
          );
          expect(result.exception).toBeUndefined();
          expect(createPayload().previewImageIds).toHaveLength(5);
        } else {
          expect(validation.errors).toHaveLength(1);
          expect(post).not.toHaveBeenCalled();
        }
      },
    );

    it.each([
      [
        'unsupported.zip',
        'application/zip',
        'validation.file.unsupported-file-type',
      ],
      [
        'unsupported.txt',
        'text/plain',
        'validation.file.text-file-no-fallback',
      ],
    ])('uses shared file validation for %s', async (fileName, mimeType, id) => {
      postData.submission.files = [
        new SubmissionFile({
          fileName,
          mimeType,
          size: 1,
          metadata: DefaultSubmissionFileMetadata(),
        }),
      ];
      const validation = await validateSubmission();
      expect(validation.errors).toContainEqual(
        expect.objectContaining({ id, field: 'files' }),
      );
      expect(post).not.toHaveBeenCalled();
    });

    it.each([
      ['image/png', 'art.png', 25 * 1024 ** 2],
      ['video/mp4', 'video.mp4', 6 * 1024 ** 3],
      ['audio/mpeg', 'audio.mp3', 15 * 1024 ** 2],
      ['application/pdf', 'comic.pdf', 500 * 1024 ** 2],
      ['application/epub+zip', 'comic.epub', 500 * 1024 ** 2],
    ] as const)(
      'uses shared size validation at the exact %s byte limit',
      async (mimeType, fileName, maxSize) => {
        for (const excess of [0, 1]) {
          postData.submission.files = [
            new SubmissionFile({
              fileName,
              mimeType,
              size: maxSize + excess,
              metadata: DefaultSubmissionFileMetadata(),
            }),
          ];
          const validation = await validateSubmission();
          const sizeErrors = validation.errors.filter(
            (error) => error.id === 'validation.file.file-size',
          );
          const sizeWarnings = validation.warnings.filter(
            (warning) => warning.id === 'validation.file.file-size',
          );
          expect(sizeErrors).toHaveLength(
            excess && mimeType !== 'image/png' ? 1 : 0,
          );
          expect(sizeWarnings).toHaveLength(
            excess && mimeType === 'image/png' ? 1 : 0,
          );
        }
        expect(post).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['image/gif', 1],
      ['video/mp4', 1],
      ['image/png', 0],
      ['image/png', 25 * 1024 ** 2 + 1],
    ] as const)(
      'still validates previews not covered by primary-file metadata (%s, %s bytes)',
      async (mimeType, size) => {
        postData.options.useThumbnailAsPreview = true;
        const result = await website.onPostFileSubmission(
          postData,
          [
            createFile('artwork', 'image/png', undefined, {
              ...thumbnail(),
              mimeType,
              buffer: Buffer.alloc(size),
            }),
          ],
          cancellation,
        );
        expect(result.exception).toBeDefined();
        expect(post).not.toHaveBeenCalled();
      },
    );
  });

  describe('failure handling', () => {
    it.each([
      { chunkSize: 0, totalChunks: 1 },
      { chunkSize: -1, totalChunks: 1 },
      { chunkSize: 7 * 1024 ** 2, totalChunks: 1 },
      { chunkSize: 3, totalChunks: 1 },
    ])('aborts invalid upload metadata (%j)', async (metadata) => {
      post.mockResolvedValueOnce(
        response({ uploadId: 'invalid', ...metadata }),
      );
      const result = await website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      expect(result.exception).toBeDefined();
      expect(put).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/upload/invalid`,
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: apiKey, Accept: 'application/json' },
        }),
      );
    });

    it.each([
      response({ message: 'Bad request' }, 400),
      response({ received: 0, total: 1 }),
      response({ received: 1, total: 2 }),
    ])(
      'does not retry permanent chunk failures or invalid acknowledgements (%j)',
      async (chunkResponse) => {
        put.mockResolvedValue(chunkResponse);
        const result = await website.onPostFileSubmission(
          postData,
          [createFile()],
          cancellation,
        );
        expect(result.exception).toBeDefined();
        expect(put).toHaveBeenCalledTimes(1);
        expect(post).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
          `${baseUrl}/upload/upload-1`,
          expect.anything(),
        );
      },
    );

    it.each([
      response({}, 429),
      response({}, 503),
      response({ errorCode: 'CHUNK_HASH_MISMATCH' }, 422),
    ])(
      'retries transient chunk responses with backoff (%j)',
      async (chunkResponse) => {
        jest.useFakeTimers();
        put.mockResolvedValueOnce(chunkResponse);
        const result = website.onPostFileSubmission(
          postData,
          [createFile()],
          cancellation,
        );
        await jest.advanceTimersByTimeAsync(499);
        expect(put).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        expect((await result).exception).toBeUndefined();
        expect(put).toHaveBeenCalledTimes(2);
        expect(put.mock.calls[0]).toEqual(put.mock.calls[1]);
      },
    );

    it('bounds network retries and preserves the final failure', async () => {
      jest.useFakeTimers();
      put.mockRejectedValue(new Error('Connection reset'));
      const result = website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      await jest.advanceTimersByTimeAsync(1500);
      expect((await result).exception?.message).toBe('Connection reset');
      expect(put).toHaveBeenCalledTimes(3);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('cancels retry backoff and still aborts the upload', async () => {
      jest.useFakeTimers();
      put.mockResolvedValue(response({}, 503));
      const result = website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      await jest.advanceTimersByTimeAsync(0);
      cancellation.abort(new Error('Cancelled'));
      expect((await result).exception).toBeDefined();
      expect(put).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/upload/upload-1`,
        expect.objectContaining({
          signal: expect.objectContaining({ aborted: false }),
        }),
      );
    });

    it('aborts a session when completing its upload fails', async () => {
      post
        .mockResolvedValueOnce(
          response({ uploadId: 'incomplete', chunkSize: 20, totalChunks: 1 }),
        )
        .mockResolvedValueOnce(response({ message: 'Failed' }, 500));
      put.mockResolvedValue(response({ received: 1, total: 1 }));
      const result = await website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      expect(result.stage).toBe('completing upload');
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/upload/incomplete`,
        expect.anything(),
      );
    });

    it('cleans completed files if a later upload fails', async () => {
      post
        .mockResolvedValueOnce(
          response({ uploadId: 'first', chunkSize: 20, totalChunks: 1 }),
        )
        .mockResolvedValueOnce(response({ fileId: fileId(1) }))
        .mockResolvedValueOnce(response({}, 500));
      put.mockResolvedValue(response({ received: 1, total: 1 }));
      const result = await website.onPostFileSubmission(
        postData,
        [createFile('first'), createFile('second')],
        cancellation,
      );
      expect(result.exception).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/upload/staging/${fileId(1)}`,
        expect.anything(),
      );
    });

    it.each([response({}, 403), response({ data: {} })])(
      'cleans staging files after a failed or malformed create response (%j)',
      async (createResponse) => {
        post
          .mockResolvedValueOnce(
            response({ uploadId: 'complete', chunkSize: 20, totalChunks: 1 }),
          )
          .mockResolvedValueOnce(response({ fileId: fileId(1) }))
          .mockResolvedValueOnce(createResponse);
        put.mockResolvedValue(response({ received: 1, total: 1 }));
        const result = await website.onPostFileSubmission(
          postData,
          [createFile()],
          cancellation,
        );
        expect(result.exception).toBeDefined();
        expect(result.stage).toBe('creating post');
        expect(fetch).toHaveBeenCalledWith(
          `${baseUrl}/upload/staging/${fileId(1)}`,
          expect.anything(),
        );
        expect(post).toHaveBeenCalledTimes(3);
      },
    );

    it('logs cleanup errors without masking the publishing failure', async () => {
      put.mockResolvedValue(response({}, 400));
      fetch.mockResolvedValue(new Response(null, { status: 503 }));
      const result = await website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      expect(result.exception?.message).toContain('HTTP 400');
      expect(website['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('cleanup failed'),
      );
    });

    it('does not start requests after cancellation', async () => {
      cancellation.abort(new Error('Cancelled before upload'));
      const result = await website.onPostFileSubmission(
        postData,
        [createFile()],
        cancellation,
      );
      expect(result.exception?.message).toBe('Cancelled before upload');
      expect(post).not.toHaveBeenCalled();
      expect(put).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
